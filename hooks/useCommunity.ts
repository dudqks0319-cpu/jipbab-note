// 이 파일은 커뮤니티 게시글/댓글/좋아요 CRUD를 Supabase 우선 + localStorage 폴백으로 제공하는 훅입니다.
"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { v4 as uuidv4 } from "uuid";

import { getDeviceId } from "@/lib/device-id";
import type {
  CommunityCommentPayload,
  CommunityCommentRecord,
  CommunityDataSource,
  CommunityLikeRecord,
  CommunityPostPayload,
  CommunityPostRecord,
  CommunityQueryError,
} from "@/types";

const PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const POSTS_TABLE = "community_posts";
const COMMENTS_TABLE = "community_comments";
const LIKES_TABLE = "community_likes";

const LOCAL_POSTS_KEY = "jipbab-note-community-posts";
const LOCAL_COMMENTS_KEY = "jipbab-note-community-comments";
const LOCAL_LIKES_KEY = "jipbab-note-community-likes";

const communityClientCache = new Map<string, SupabaseClient>();

interface CommunityViewer {
  userId: string | null;
  deviceId: string;
  authorName: string;
}

interface UseCommunityState {
  posts: CommunityPostRecord[];
  comments: CommunityCommentRecord[];
  likes: CommunityLikeRecord[];
}

function createCommunityError(message: string, source: CommunityQueryError["source"]): CommunityQueryError {
  return { message, source };
}

function normalizeMessage(value: unknown, fallback: string): string {
  if (value instanceof Error && value.message.trim()) {
    return value.message;
  }
  if (typeof value === "string" && value.trim()) {
    return value;
  }
  return fallback;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function readString(value: unknown, fallback = ""): string {
  return typeof value === "string" && value.trim().length > 0 ? value : fallback;
}

function readNullableString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized ? normalized : null;
}

function isMissingTableError(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const code = typeof value.code === "string" ? value.code.toUpperCase() : "";
  if (code === "PGRST205" || code === "42P01") {
    return true;
  }

  const message = `${typeof value.message === "string" ? value.message : ""} ${
    typeof value.details === "string" ? value.details : ""
  }`.toLowerCase();

  return (
    message.includes("does not exist") ||
    message.includes("could not find the table") ||
    message.includes("schema cache")
  );
}

function isMissingColumnError(value: unknown): boolean {
  if (!isRecord(value)) {
    return false;
  }

  const code = typeof value.code === "string" ? value.code.toUpperCase() : "";
  if (code === "42703" || code === "PGRST204") {
    return true;
  }

  const message = `${typeof value.message === "string" ? value.message : ""} ${
    typeof value.details === "string" ? value.details : ""
  }`.toLowerCase();

  return message.includes("column") && message.includes("does not exist");
}

function createCommunityClient(deviceId: string): SupabaseClient | null {
  if (!PUBLIC_SUPABASE_URL || !PUBLIC_SUPABASE_ANON_KEY) {
    return null;
  }

  const normalizedDeviceId = deviceId.trim();
  const cacheKey = normalizedDeviceId || "default";
  const cached = communityClientCache.get(cacheKey);
  if (cached) {
    return cached;
  }

  const headers: Record<string, string> = {
    "x-client-info": "jipbab-note-web-community",
  };

  if (normalizedDeviceId) {
    headers["x-device-id"] = normalizedDeviceId;
  }

  const client = createClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
    global: {
      headers,
    },
  });

  communityClientCache.set(cacheKey, client);
  return client;
}

function resolveAuthorNameFromMetadata(user: {
  email?: string;
  user_metadata?: Record<string, unknown>;
}): string {
  const fullName = readNullableString(user.user_metadata?.full_name);
  if (fullName) {
    return fullName;
  }

  const name = readNullableString(user.user_metadata?.name);
  if (name) {
    return name;
  }

  if (typeof user.email === "string" && user.email.includes("@")) {
    return user.email.split("@")[0] || "익명 집밥러";
  }

  return "익명 집밥러";
}

async function resolveViewer(client: SupabaseClient | null, deviceId: string): Promise<CommunityViewer> {
  if (!client) {
    return {
      userId: null,
      deviceId,
      authorName: "익명 집밥러",
    };
  }

  const { data, error } = await client.auth.getUser();
  if (error || !data.user) {
    return {
      userId: null,
      deviceId,
      authorName: "익명 집밥러",
    };
  }

  return {
    userId: data.user.id,
    deviceId,
    authorName: resolveAuthorNameFromMetadata({
      email: data.user.email,
      user_metadata: data.user.user_metadata,
    }),
  };
}

function mapPostRow(row: Record<string, unknown>, fallbackDeviceId: string): CommunityPostRecord {
  const createdAt = readString(row.created_at ?? row.createdAt, new Date().toISOString());

  return {
    id: readString(row.id, uuidv4()),
    deviceId: readString(row.device_id ?? row.deviceId, fallbackDeviceId),
    userId: readNullableString(row.user_id ?? row.userId),
    authorName: readString(row.author_name ?? row.authorName, "집밥러"),
    title: readString(row.title, "제목 없음"),
    content: readString(row.content),
    commentCount:
      typeof row.commentCount === "number" && Number.isFinite(row.commentCount) ? row.commentCount : 0,
    likeCount: typeof row.likeCount === "number" && Number.isFinite(row.likeCount) ? row.likeCount : 0,
    likedByMe: Boolean(row.likedByMe),
    createdAt,
    updatedAt: readString(row.updated_at ?? row.updatedAt, createdAt),
  };
}

function mapCommentRow(row: Record<string, unknown>, fallbackDeviceId: string): CommunityCommentRecord {
  const createdAt = readString(row.created_at ?? row.createdAt, new Date().toISOString());

  return {
    id: readString(row.id, uuidv4()),
    postId: readString(row.post_id ?? row.postId),
    deviceId: readString(row.device_id ?? row.deviceId, fallbackDeviceId),
    userId: readNullableString(row.user_id ?? row.userId),
    authorName: readString(row.author_name ?? row.authorName, "집밥러"),
    content: readString(row.content),
    createdAt,
    updatedAt: readString(row.updated_at ?? row.updatedAt, createdAt),
  };
}

function mapLikeRow(row: Record<string, unknown>, fallbackDeviceId: string): CommunityLikeRecord {
  return {
    id: readString(row.id, uuidv4()),
    postId: readString(row.post_id ?? row.postId),
    deviceId: readNullableString(row.device_id ?? row.deviceId) ?? fallbackDeviceId,
    userId: readNullableString(row.user_id ?? row.userId),
    createdAt: readString(row.created_at ?? row.createdAt, new Date().toISOString()),
  };
}

function safeReadLocalPosts(): CommunityPostRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(LOCAL_POSTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => mapPostRow(item, readString(item.deviceId)));
  } catch {
    return [];
  }
}

function safeReadLocalComments(): CommunityCommentRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(LOCAL_COMMENTS_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => mapCommentRow(item, readString(item.deviceId)));
  } catch {
    return [];
  }
}

function safeReadLocalLikes(): CommunityLikeRecord[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(LOCAL_LIKES_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter((item): item is Record<string, unknown> => isRecord(item))
      .map((item) => mapLikeRow(item, readString(item.deviceId)));
  } catch {
    return [];
  }
}

function safeWriteLocalState(state: UseCommunityState): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(LOCAL_POSTS_KEY, JSON.stringify(state.posts));
  window.localStorage.setItem(LOCAL_COMMENTS_KEY, JSON.stringify(state.comments));
  window.localStorage.setItem(LOCAL_LIKES_KEY, JSON.stringify(state.likes));
}

function isOwnedByViewer(record: { userId: string | null; deviceId: string }, viewer: CommunityViewer): boolean {
  if (viewer.userId) {
    return record.userId === viewer.userId;
  }
  return record.deviceId === viewer.deviceId;
}

function isLikeOfViewer(record: CommunityLikeRecord, viewer: CommunityViewer): boolean {
  if (viewer.userId) {
    return record.userId === viewer.userId;
  }
  return record.deviceId === viewer.deviceId;
}

function hydratePosts(
  posts: CommunityPostRecord[],
  comments: CommunityCommentRecord[],
  likes: CommunityLikeRecord[],
  viewer: CommunityViewer,
): CommunityPostRecord[] {
  return [...posts]
    .map((post) => {
      const commentCount = comments.filter((comment) => comment.postId === post.id).length;
      const likeCount = likes.filter((like) => like.postId === post.id).length;
      const likedByMe = likes.some((like) => like.postId === post.id && isLikeOfViewer(like, viewer));

      return {
        ...post,
        commentCount,
        likeCount,
        likedByMe,
      };
    })
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

function groupCommentsByPost(comments: CommunityCommentRecord[]): Record<string, CommunityCommentRecord[]> {
  return comments.reduce<Record<string, CommunityCommentRecord[]>>((acc, comment) => {
    const current = acc[comment.postId] ?? [];
    acc[comment.postId] = [...current, comment].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
    return acc;
  }, {});
}

function normalizePostPayload(payload: CommunityPostPayload): CommunityPostPayload {
  return {
    title: payload.title.trim(),
    content: payload.content.trim(),
  };
}

function normalizeCommentPayload(payload: CommunityCommentPayload): CommunityCommentPayload {
  return {
    content: payload.content.trim(),
  };
}

async function insertPostWithOptionalAuthor(
  client: SupabaseClient,
  payload: {
    device_id: string;
    user_id: string | null;
    title: string;
    content: string;
    author_name: string;
  },
): Promise<Record<string, unknown>> {
  const firstAttempt = await client.from(POSTS_TABLE).insert(payload).select("*").single();

  if (!firstAttempt.error) {
    return (firstAttempt.data ?? {}) as Record<string, unknown>;
  }

  if (!isMissingColumnError(firstAttempt.error)) {
    throw firstAttempt.error;
  }

  const fallbackAttempt = await client
    .from(POSTS_TABLE)
    .insert({
      device_id: payload.device_id,
      user_id: payload.user_id,
      title: payload.title,
      content: payload.content,
    })
    .select("*")
    .single();

  if (fallbackAttempt.error) {
    throw fallbackAttempt.error;
  }

  return (fallbackAttempt.data ?? {}) as Record<string, unknown>;
}

async function insertCommentWithOptionalAuthor(
  client: SupabaseClient,
  payload: {
    post_id: string;
    device_id: string;
    user_id: string | null;
    content: string;
    author_name: string;
  },
): Promise<Record<string, unknown>> {
  const firstAttempt = await client.from(COMMENTS_TABLE).insert(payload).select("*").single();

  if (!firstAttempt.error) {
    return (firstAttempt.data ?? {}) as Record<string, unknown>;
  }

  if (!isMissingColumnError(firstAttempt.error)) {
    throw firstAttempt.error;
  }

  const fallbackAttempt = await client
    .from(COMMENTS_TABLE)
    .insert({
      post_id: payload.post_id,
      device_id: payload.device_id,
      user_id: payload.user_id,
      content: payload.content,
    })
    .select("*")
    .single();

  if (fallbackAttempt.error) {
    throw fallbackAttempt.error;
  }

  return (fallbackAttempt.data ?? {}) as Record<string, unknown>;
}

export interface UseCommunityResult {
  viewerUserId: string | null;
  viewerDeviceId: string;
  viewerName: string;
  source: CommunityDataSource;
  posts: CommunityPostRecord[];
  commentsByPostId: Record<string, CommunityCommentRecord[]>;
  loading: boolean;
  writing: boolean;
  error: CommunityQueryError | null;
  refreshCommunity: () => Promise<void>;
  createPost: (payload: CommunityPostPayload) => Promise<CommunityPostRecord | null>;
  updatePost: (postId: string, payload: CommunityPostPayload) => Promise<CommunityPostRecord | null>;
  deletePost: (postId: string) => Promise<boolean>;
  createComment: (postId: string, payload: CommunityCommentPayload) => Promise<CommunityCommentRecord | null>;
  deleteComment: (commentId: string) => Promise<boolean>;
  toggleLike: (postId: string) => Promise<boolean>;
}

export function useCommunity(): UseCommunityResult {
  const deviceId = useMemo(() => getDeviceId(), []);

  const [viewer, setViewer] = useState<CommunityViewer>({
    userId: null,
    deviceId,
    authorName: "익명 집밥러",
  });

  const [source, setSource] = useState<CommunityDataSource>("supabase");
  const [posts, setPosts] = useState<CommunityPostRecord[]>([]);
  const [comments, setComments] = useState<CommunityCommentRecord[]>([]);
  const [likes, setLikes] = useState<CommunityLikeRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [writing, setWriting] = useState<boolean>(false);
  const [error, setError] = useState<CommunityQueryError | null>(null);

  const viewerRef = useRef<CommunityViewer>(viewer);
  const postsRef = useRef<CommunityPostRecord[]>([]);
  const commentsRef = useRef<CommunityCommentRecord[]>([]);
  const likesRef = useRef<CommunityLikeRecord[]>([]);

  const updateViewer = useCallback((nextViewer: CommunityViewer) => {
    viewerRef.current = nextViewer;
    setViewer(nextViewer);
  }, []);

  const commitState = useCallback((nextState: UseCommunityState) => {
    postsRef.current = nextState.posts;
    commentsRef.current = nextState.comments;
    likesRef.current = nextState.likes;

    setPosts(nextState.posts);
    setComments(nextState.comments);
    setLikes(nextState.likes);

    safeWriteLocalState(nextState);
  }, []);

  const loadLocalFallback = useCallback(
    (fallbackMessage: string) => {
      const localState: UseCommunityState = {
        posts: safeReadLocalPosts(),
        comments: safeReadLocalComments(),
        likes: safeReadLocalLikes(),
      };

      commitState(localState);
      setSource("local");
      setError(createCommunityError(fallbackMessage, "supabase"));
    },
    [commitState],
  );

  const refreshCommunity = useCallback(async () => {
    setLoading(true);
    setError(null);

    const client = createCommunityClient(deviceId);
    if (!client) {
      loadLocalFallback("Supabase 환경변수가 없어 로컬 모드로 동작합니다.");
      setLoading(false);
      return;
    }

    try {
      const nextViewer = await resolveViewer(client, deviceId);
      updateViewer(nextViewer);

      const [postsResult, commentsResult, likesResult] = await Promise.all([
        client.from(POSTS_TABLE).select("*").order("created_at", { ascending: false }),
        client.from(COMMENTS_TABLE).select("*").order("created_at", { ascending: true }),
        client.from(LIKES_TABLE).select("*").order("created_at", { ascending: true }),
      ]);

      const firstError = postsResult.error ?? commentsResult.error ?? likesResult.error;
      if (firstError) {
        throw firstError;
      }

      const nextState: UseCommunityState = {
        posts: (postsResult.data ?? [])
          .filter((row): row is Record<string, unknown> => isRecord(row))
          .map((row) => mapPostRow(row, deviceId)),
        comments: (commentsResult.data ?? [])
          .filter((row): row is Record<string, unknown> => isRecord(row))
          .map((row) => mapCommentRow(row, deviceId)),
        likes: (likesResult.data ?? [])
          .filter((row): row is Record<string, unknown> => isRecord(row))
          .map((row) => mapLikeRow(row, deviceId)),
      };

      commitState(nextState);
      setSource("supabase");
    } catch (caught) {
      if (isMissingTableError(caught)) {
        loadLocalFallback("커뮤니티 테이블이 아직 없어 로컬 모드로 동작합니다.");
      } else {
        loadLocalFallback(normalizeMessage(caught, "커뮤니티 데이터를 불러오지 못해 로컬 모드로 전환했습니다."));
      }
    } finally {
      setLoading(false);
    }
  }, [commitState, deviceId, loadLocalFallback, updateViewer]);

  const createPost = useCallback(
    async (payload: CommunityPostPayload): Promise<CommunityPostRecord | null> => {
      const normalized = normalizePostPayload(payload);
      if (!normalized.title || !normalized.content) {
        setError(createCommunityError("제목과 내용을 모두 입력해주세요.", "local"));
        return null;
      }

      setWriting(true);
      setError(null);

      const client = createCommunityClient(deviceId);

      try {
        const actor = await resolveViewer(client, deviceId);
        updateViewer(actor);

        if (!client) {
          throw new Error("Supabase client 없음");
        }

        const inserted = await insertPostWithOptionalAuthor(client, {
          device_id: actor.deviceId,
          user_id: actor.userId,
          title: normalized.title,
          content: normalized.content,
          author_name: actor.authorName,
        });

        const createdRecord = mapPostRow(inserted, actor.deviceId);
        const nextState: UseCommunityState = {
          posts: [createdRecord, ...postsRef.current.filter((item) => item.id !== createdRecord.id)],
          comments: commentsRef.current,
          likes: likesRef.current,
        };

        commitState(nextState);
        setSource("supabase");
        return createdRecord;
      } catch (caught) {
        const actor = viewerRef.current;
        const now = new Date().toISOString();
        const localRecord: CommunityPostRecord = {
          id: uuidv4(),
          deviceId: actor.deviceId,
          userId: actor.userId,
          authorName: actor.authorName,
          title: normalized.title,
          content: normalized.content,
          commentCount: 0,
          likeCount: 0,
          likedByMe: false,
          createdAt: now,
          updatedAt: now,
        };

        const nextState: UseCommunityState = {
          posts: [localRecord, ...postsRef.current],
          comments: commentsRef.current,
          likes: likesRef.current,
        };

        commitState(nextState);
        setSource("local");

        const fallbackMessage = isMissingTableError(caught)
          ? "커뮤니티 테이블이 없어 로컬에 글을 저장했습니다."
          : normalizeMessage(caught, "글 저장 실패로 로컬에 임시 저장했습니다.");

        setError(createCommunityError(fallbackMessage, "supabase"));
        return localRecord;
      } finally {
        setWriting(false);
      }
    },
    [commitState, deviceId, updateViewer],
  );

  const updatePost = useCallback(
    async (postId: string, payload: CommunityPostPayload): Promise<CommunityPostRecord | null> => {
      const normalized = normalizePostPayload(payload);
      if (!normalized.title || !normalized.content) {
        setError(createCommunityError("제목과 내용을 모두 입력해주세요.", "local"));
        return null;
      }

      setWriting(true);
      setError(null);

      const actor = viewerRef.current;
      const targetPost = postsRef.current.find((post) => post.id === postId);
      if (!targetPost || !isOwnedByViewer(targetPost, actor)) {
        setWriting(false);
        setError(createCommunityError("수정 권한이 없습니다.", "local"));
        return null;
      }

      const client = createCommunityClient(deviceId);

      try {
        if (!client) {
          throw new Error("Supabase client 없음");
        }

        const { data, error: updateError } = await client
          .from(POSTS_TABLE)
          .update({
            title: normalized.title,
            content: normalized.content,
          })
          .eq("id", postId)
          .select("*")
          .maybeSingle();

        if (updateError) {
          throw updateError;
        }

        const nextRecord = data && isRecord(data)
          ? mapPostRow(data, actor.deviceId)
          : {
              ...targetPost,
              title: normalized.title,
              content: normalized.content,
              updatedAt: new Date().toISOString(),
            };

        const nextState: UseCommunityState = {
          posts: postsRef.current.map((post) => (post.id === postId ? nextRecord : post)),
          comments: commentsRef.current,
          likes: likesRef.current,
        };

        commitState(nextState);
        setSource("supabase");
        return nextRecord;
      } catch (caught) {
        const nextRecord: CommunityPostRecord = {
          ...targetPost,
          title: normalized.title,
          content: normalized.content,
          updatedAt: new Date().toISOString(),
        };

        const nextState: UseCommunityState = {
          posts: postsRef.current.map((post) => (post.id === postId ? nextRecord : post)),
          comments: commentsRef.current,
          likes: likesRef.current,
        };

        commitState(nextState);
        setSource("local");

        const fallbackMessage = isMissingTableError(caught)
          ? "커뮤니티 테이블이 없어 로컬에서 수정했습니다."
          : normalizeMessage(caught, "글 수정 실패로 로컬 반영만 완료했습니다.");

        setError(createCommunityError(fallbackMessage, "supabase"));
        return nextRecord;
      } finally {
        setWriting(false);
      }
    },
    [commitState, deviceId],
  );

  const deletePost = useCallback(
    async (postId: string): Promise<boolean> => {
      setWriting(true);
      setError(null);

      const actor = viewerRef.current;
      const targetPost = postsRef.current.find((post) => post.id === postId);
      if (!targetPost || !isOwnedByViewer(targetPost, actor)) {
        setWriting(false);
        setError(createCommunityError("삭제 권한이 없습니다.", "local"));
        return false;
      }

      const client = createCommunityClient(deviceId);

      try {
        if (!client) {
          throw new Error("Supabase client 없음");
        }

        const commentDeleteResult = await client.from(COMMENTS_TABLE).delete().eq("post_id", postId);
        if (commentDeleteResult.error && !isMissingTableError(commentDeleteResult.error)) {
          throw commentDeleteResult.error;
        }

        const likeDeleteResult = await client.from(LIKES_TABLE).delete().eq("post_id", postId);
        if (likeDeleteResult.error && !isMissingTableError(likeDeleteResult.error)) {
          throw likeDeleteResult.error;
        }

        const postDeleteResult = await client.from(POSTS_TABLE).delete().eq("id", postId);
        if (postDeleteResult.error) {
          throw postDeleteResult.error;
        }

        const nextState: UseCommunityState = {
          posts: postsRef.current.filter((post) => post.id !== postId),
          comments: commentsRef.current.filter((comment) => comment.postId !== postId),
          likes: likesRef.current.filter((like) => like.postId !== postId),
        };

        commitState(nextState);
        setSource("supabase");
        return true;
      } catch (caught) {
        const nextState: UseCommunityState = {
          posts: postsRef.current.filter((post) => post.id !== postId),
          comments: commentsRef.current.filter((comment) => comment.postId !== postId),
          likes: likesRef.current.filter((like) => like.postId !== postId),
        };

        commitState(nextState);
        setSource("local");

        const fallbackMessage = isMissingTableError(caught)
          ? "커뮤니티 테이블이 없어 로컬에서 삭제했습니다."
          : normalizeMessage(caught, "삭제 실패로 로컬 상태에서만 제거했습니다.");

        setError(createCommunityError(fallbackMessage, "supabase"));
        return true;
      } finally {
        setWriting(false);
      }
    },
    [commitState, deviceId],
  );

  const createComment = useCallback(
    async (postId: string, payload: CommunityCommentPayload): Promise<CommunityCommentRecord | null> => {
      const normalized = normalizeCommentPayload(payload);
      if (!normalized.content) {
        setError(createCommunityError("댓글 내용을 입력해주세요.", "local"));
        return null;
      }

      setWriting(true);
      setError(null);

      const client = createCommunityClient(deviceId);

      try {
        const actor = await resolveViewer(client, deviceId);
        updateViewer(actor);

        if (!client) {
          throw new Error("Supabase client 없음");
        }

        const inserted = await insertCommentWithOptionalAuthor(client, {
          post_id: postId,
          device_id: actor.deviceId,
          user_id: actor.userId,
          content: normalized.content,
          author_name: actor.authorName,
        });

        const createdRecord = mapCommentRow(inserted, actor.deviceId);

        const nextState: UseCommunityState = {
          posts: postsRef.current,
          comments: [...commentsRef.current, createdRecord],
          likes: likesRef.current,
        };

        commitState(nextState);
        setSource("supabase");
        return createdRecord;
      } catch (caught) {
        const actor = viewerRef.current;
        const now = new Date().toISOString();

        const localRecord: CommunityCommentRecord = {
          id: uuidv4(),
          postId,
          deviceId: actor.deviceId,
          userId: actor.userId,
          authorName: actor.authorName,
          content: normalized.content,
          createdAt: now,
          updatedAt: now,
        };

        const nextState: UseCommunityState = {
          posts: postsRef.current,
          comments: [...commentsRef.current, localRecord],
          likes: likesRef.current,
        };

        commitState(nextState);
        setSource("local");

        const fallbackMessage = isMissingTableError(caught)
          ? "커뮤니티 테이블이 없어 로컬에 댓글을 저장했습니다."
          : normalizeMessage(caught, "댓글 저장 실패로 로컬에 임시 저장했습니다.");

        setError(createCommunityError(fallbackMessage, "supabase"));
        return localRecord;
      } finally {
        setWriting(false);
      }
    },
    [commitState, deviceId, updateViewer],
  );

  const deleteComment = useCallback(
    async (commentId: string): Promise<boolean> => {
      setWriting(true);
      setError(null);

      const actor = viewerRef.current;
      const targetComment = commentsRef.current.find((comment) => comment.id === commentId);

      if (!targetComment || !isOwnedByViewer(targetComment, actor)) {
        setWriting(false);
        setError(createCommunityError("삭제 권한이 없습니다.", "local"));
        return false;
      }

      const client = createCommunityClient(deviceId);

      try {
        if (!client) {
          throw new Error("Supabase client 없음");
        }

        const { error: deleteError } = await client.from(COMMENTS_TABLE).delete().eq("id", commentId);
        if (deleteError) {
          throw deleteError;
        }

        const nextState: UseCommunityState = {
          posts: postsRef.current,
          comments: commentsRef.current.filter((comment) => comment.id !== commentId),
          likes: likesRef.current,
        };

        commitState(nextState);
        setSource("supabase");
        return true;
      } catch (caught) {
        const nextState: UseCommunityState = {
          posts: postsRef.current,
          comments: commentsRef.current.filter((comment) => comment.id !== commentId),
          likes: likesRef.current,
        };

        commitState(nextState);
        setSource("local");

        const fallbackMessage = isMissingTableError(caught)
          ? "커뮤니티 테이블이 없어 로컬에서 댓글을 삭제했습니다."
          : normalizeMessage(caught, "댓글 삭제 실패로 로컬 상태에서만 제거했습니다.");

        setError(createCommunityError(fallbackMessage, "supabase"));
        return true;
      } finally {
        setWriting(false);
      }
    },
    [commitState, deviceId],
  );

  const toggleLike = useCallback(
    async (postId: string): Promise<boolean> => {
      setWriting(true);
      setError(null);

      const actor = viewerRef.current;
      const existingLocalLike = likesRef.current.find((like) => like.postId === postId && isLikeOfViewer(like, actor));
      const client = createCommunityClient(deviceId);

      try {
        if (!client) {
          throw new Error("Supabase client 없음");
        }

        let query = client.from(LIKES_TABLE).select("*").eq("post_id", postId).limit(1);
        if (actor.userId) {
          query = query.eq("user_id", actor.userId);
        } else {
          query = query.eq("device_id", actor.deviceId).is("user_id", null);
        }

        const { data: existingRows, error: selectError } = await query;
        if (selectError) {
          throw selectError;
        }

        const existingRemoteLike = (existingRows ?? []).find((row): row is Record<string, unknown> => isRecord(row));

        if (existingRemoteLike) {
          const { error: deleteError } = await client
            .from(LIKES_TABLE)
            .delete()
            .eq("id", readString(existingRemoteLike.id));

          if (deleteError) {
            throw deleteError;
          }

          const deletedId = readString(existingRemoteLike.id);
          const nextState: UseCommunityState = {
            posts: postsRef.current,
            comments: commentsRef.current,
            likes: likesRef.current.filter((like) => like.id !== deletedId),
          };

          commitState(nextState);
          setSource("supabase");
          return false;
        }

        const { data: insertedLike, error: insertError } = await client
          .from(LIKES_TABLE)
          .insert({
            post_id: postId,
            device_id: actor.deviceId,
            user_id: actor.userId,
          })
          .select("*")
          .single();

        if (insertError) {
          throw insertError;
        }

        const nextLike = isRecord(insertedLike)
          ? mapLikeRow(insertedLike, actor.deviceId)
          : {
              id: uuidv4(),
              postId,
              deviceId: actor.deviceId,
              userId: actor.userId,
              createdAt: new Date().toISOString(),
            };

        const nextState: UseCommunityState = {
          posts: postsRef.current,
          comments: commentsRef.current,
          likes: [...likesRef.current, nextLike],
        };

        commitState(nextState);
        setSource("supabase");
        return true;
      } catch (caught) {
        let nextLikedState = false;
        let nextLikes = likesRef.current;

        if (existingLocalLike) {
          nextLikes = likesRef.current.filter((like) => like.id !== existingLocalLike.id);
          nextLikedState = false;
        } else {
          const localLike: CommunityLikeRecord = {
            id: uuidv4(),
            postId,
            deviceId: actor.deviceId,
            userId: actor.userId,
            createdAt: new Date().toISOString(),
          };
          nextLikes = [...likesRef.current, localLike];
          nextLikedState = true;
        }

        const nextState: UseCommunityState = {
          posts: postsRef.current,
          comments: commentsRef.current,
          likes: nextLikes,
        };

        commitState(nextState);
        setSource("local");

        const fallbackMessage = isMissingTableError(caught)
          ? "커뮤니티 테이블이 없어 로컬에서 좋아요를 처리했습니다."
          : normalizeMessage(caught, "좋아요 처리 실패로 로컬 상태만 반영했습니다.");

        setError(createCommunityError(fallbackMessage, "supabase"));
        return nextLikedState;
      } finally {
        setWriting(false);
      }
    },
    [commitState, deviceId],
  );

  useEffect(() => {
    const client = createCommunityClient(deviceId);
    if (!client) {
      updateViewer({
        userId: null,
        deviceId,
        authorName: "익명 집밥러",
      });
      return;
    }

    let isMounted = true;

    const syncViewer = async () => {
      const nextViewer = await resolveViewer(client, deviceId);
      if (!isMounted) {
        return;
      }
      updateViewer(nextViewer);
    };

    void syncViewer();

    const { data: subscription } = client.auth.onAuthStateChange((_event, session) => {
      const nextUser = session?.user;

      if (!nextUser) {
        updateViewer({
          userId: null,
          deviceId,
          authorName: "익명 집밥러",
        });
        return;
      }

      updateViewer({
        userId: nextUser.id,
        deviceId,
        authorName: resolveAuthorNameFromMetadata({
          email: nextUser.email,
          user_metadata: nextUser.user_metadata,
        }),
      });
    });

    return () => {
      isMounted = false;
      subscription.subscription.unsubscribe();
    };
  }, [deviceId, updateViewer]);

  useEffect(() => {
    void refreshCommunity();
  }, [refreshCommunity]);

  const hydratedPosts = useMemo(
    () => hydratePosts(posts, comments, likes, viewer),
    [comments, likes, posts, viewer],
  );

  const commentsByPostId = useMemo(() => groupCommentsByPost(comments), [comments]);

  return {
    viewerUserId: viewer.userId,
    viewerDeviceId: viewer.deviceId,
    viewerName: viewer.authorName,
    source,
    posts: hydratedPosts,
    commentsByPostId,
    loading,
    writing,
    error,
    refreshCommunity,
    createPost,
    updatePost,
    deletePost,
    createComment,
    deleteComment,
    toggleLike,
  };
}
