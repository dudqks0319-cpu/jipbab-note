// 이 파일은 집밥노트 WebView에서 iOS 온디바이스 Gemma 4 E2B 모델을 호출하는 Capacitor 플러그인입니다.
import Capacitor
import Foundation
import LiteRTLMEngine

@objc(JipbabGemmaPlugin)
public class JipbabGemmaPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "JipbabGemmaPlugin"
    public let jsName = "JipbabGemma"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "status", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "download", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "remove", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "generate", returnType: CAPPluginReturnPromise)
    ]

    private let modelName = "Gemma-4-E2B-it"
    private let modelFileName = "gemma-4-E2B-it.litertlm"
    private let modelSizeBytes: Int64 = 2_583_085_056
    private let modelURL = URL(string: "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm/resolve/main/gemma-4-E2B-it.litertlm")!
    private let workQueue = DispatchQueue(label: "com.jipbab.note.gemma", qos: .userInitiated)
    private var engine: OpaquePointer?

    deinit {
        if let engine {
            litert_lm_engine_delete(engine)
        }
    }

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(statusPayload())
    }

    @objc func download(_ call: CAPPluginCall) {
        let destination = modelFileURL()

        if FileManager.default.fileExists(atPath: destination.path) {
            call.resolve(statusPayload())
            return
        }

        ensureModelDirectory()

        let task = URLSession.shared.downloadTask(with: modelURL) { [weak self] temporaryURL, response, error in
            guard let self else { return }

            if let error {
                call.reject("모델 다운로드에 실패했습니다.", "DOWNLOAD_FAILED", error)
                return
            }

            guard let temporaryURL else {
                call.reject("모델 다운로드 파일을 찾지 못했습니다.", "DOWNLOAD_EMPTY")
                return
            }

            do {
                if FileManager.default.fileExists(atPath: destination.path) {
                    try FileManager.default.removeItem(at: destination)
                }
                try FileManager.default.moveItem(at: temporaryURL, to: destination)
                call.resolve(self.statusPayload(response: response))
            } catch {
                call.reject("모델 파일 저장에 실패했습니다.", "SAVE_FAILED", error)
            }
        }

        task.resume()
    }

    @objc func remove(_ call: CAPPluginCall) {
        workQueue.async { [weak self] in
            guard let self else { return }
            if let engine {
                litert_lm_engine_delete(engine)
                self.engine = nil
            }

            do {
                let url = modelFileURL()
                if FileManager.default.fileExists(atPath: url.path) {
                    try FileManager.default.removeItem(at: url)
                }
                call.resolve(statusPayload())
            } catch {
                call.reject("모델 삭제에 실패했습니다.", "REMOVE_FAILED", error)
            }
        }
    }

    @objc func generate(_ call: CAPPluginCall) {
        let prompt = call.getString("prompt")?.trimmingCharacters(in: .whitespacesAndNewlines) ?? ""
        let maxTokens = min(max(call.getInt("maxTokens") ?? 512, 64), 1024)

        guard prompt.count >= 2 else {
            call.reject("프롬프트를 입력해 주세요.", "INVALID_PROMPT")
            return
        }

        workQueue.async { [weak self] in
            guard let self else { return }

            do {
                let output = try generateText(prompt: prompt, maxTokens: maxTokens)
                call.resolve([
                    "text": output,
                    "modelName": modelName,
                    "backend": "cpu"
                ])
            } catch {
                call.reject(error.localizedDescription, "GENERATE_FAILED", error)
            }
        }
    }

    private func generateText(prompt: String, maxTokens: Int) throws -> String {
        guard FileManager.default.fileExists(atPath: modelFileURL().path) else {
            throw GemmaError.modelMissing
        }

        let engine = try loadedEngine(maxTokens: maxTokens)
        guard let sessionConfig = litert_lm_session_config_create() else {
            throw GemmaError.sessionConfigFailed
        }
        defer { litert_lm_session_config_delete(sessionConfig) }

        litert_lm_session_config_set_max_output_tokens(sessionConfig, Int32(maxTokens))

        guard let session = litert_lm_engine_create_session(engine, sessionConfig) else {
            throw GemmaError.sessionCreateFailed
        }
        defer { litert_lm_session_delete(session) }

        return try prompt.withCString { cPrompt in
            var input = InputData(
                type: kInputText,
                data: UnsafeRawPointer(cPrompt),
                size: strlen(cPrompt)
            )

            guard let responses = litert_lm_session_generate_content(session, &input, 1) else {
                throw GemmaError.generationFailed
            }
            defer { litert_lm_responses_delete(responses) }

            guard litert_lm_responses_get_num_candidates(responses) > 0,
                  let responseText = litert_lm_responses_get_response_text_at(responses, 0) else {
                throw GemmaError.emptyResponse
            }

            return String(cString: responseText)
        }
    }

    private func loadedEngine(maxTokens: Int) throws -> OpaquePointer {
        if let engine {
            return engine
        }

        guard let settings = litert_lm_engine_settings_create(modelFileURL().path, "cpu", nil, nil) else {
            throw GemmaError.engineSettingsFailed
        }
        defer { litert_lm_engine_settings_delete(settings) }

        litert_lm_engine_settings_set_max_num_tokens(settings, Int32(max(maxTokens, 2048)))
        litert_lm_engine_settings_set_cache_dir(settings, cacheDirectoryURL().path)

        guard let createdEngine = litert_lm_engine_create(settings) else {
            throw GemmaError.engineCreateFailed
        }

        engine = createdEngine
        return createdEngine
    }

    private func statusPayload(response: URLResponse? = nil) -> [String: Any] {
        let fileURL = modelFileURL()
        let exists = FileManager.default.fileExists(atPath: fileURL.path)
        let fileSize = existingModelSize(fileURL)

        return [
            "supported": true,
            "modelName": modelName,
            "fileName": modelFileName,
            "installed": exists && fileSize > 0,
            "sizeBytes": modelSizeBytes,
            "downloadedBytes": fileSize,
            "downloadURL": modelURL.absoluteString,
            "backend": "cpu",
            "httpStatus": (response as? HTTPURLResponse)?.statusCode as Any
        ]
    }

    private func existingModelSize(_ fileURL: URL) -> Int64 {
        guard let attributes = try? FileManager.default.attributesOfItem(atPath: fileURL.path),
              let size = attributes[.size] as? NSNumber else {
            return 0
        }
        return size.int64Value
    }

    private func ensureModelDirectory() {
        try? FileManager.default.createDirectory(at: modelDirectoryURL(), withIntermediateDirectories: true)
        try? FileManager.default.createDirectory(at: cacheDirectoryURL(), withIntermediateDirectories: true)
    }

    private func modelFileURL() -> URL {
        modelDirectoryURL().appendingPathComponent(modelFileName)
    }

    private func modelDirectoryURL() -> URL {
        applicationSupportURL().appendingPathComponent("Gemma4", isDirectory: true)
    }

    private func cacheDirectoryURL() -> URL {
        modelDirectoryURL().appendingPathComponent("Cache", isDirectory: true)
    }

    private func applicationSupportURL() -> URL {
        FileManager.default.urls(for: .applicationSupportDirectory, in: .userDomainMask)[0]
    }
}

private enum GemmaError: LocalizedError {
    case modelMissing
    case engineSettingsFailed
    case engineCreateFailed
    case sessionConfigFailed
    case sessionCreateFailed
    case generationFailed
    case emptyResponse

    var errorDescription: String? {
        switch self {
        case .modelMissing:
            return "Gemma 4 E2B 모델이 아직 설치되지 않았습니다."
        case .engineSettingsFailed:
            return "Gemma 실행 설정을 만들지 못했습니다."
        case .engineCreateFailed:
            return "Gemma 실행 엔진을 시작하지 못했습니다."
        case .sessionConfigFailed:
            return "Gemma 세션 설정을 만들지 못했습니다."
        case .sessionCreateFailed:
            return "Gemma 세션을 시작하지 못했습니다."
        case .generationFailed:
            return "Gemma 응답 생성에 실패했습니다."
        case .emptyResponse:
            return "Gemma 응답이 비어 있습니다."
        }
    }
}
