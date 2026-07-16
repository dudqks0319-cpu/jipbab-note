import AuthenticationServices
import Capacitor
import Foundation
import UIKit

@objc(JipbabOAuthPlugin)
public class JipbabOAuthPlugin: CAPPlugin, CAPBridgedPlugin, ASWebAuthenticationPresentationContextProviding {
    public let identifier = "JipbabOAuthPlugin"
    public let jsName = "JipbabOAuth"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "authenticate", returnType: CAPPluginReturnPromise)
    ]

    private var activeSession: ASWebAuthenticationSession?
    private var activeCall: CAPPluginCall?
    private var activeCallbackScheme: String?

    public override func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleOpenUrl(notification:)),
            name: Notification.Name.capacitorOpenURL,
            object: nil
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc func authenticate(_ call: CAPPluginCall) {
        guard activeSession == nil else {
            call.reject("OAuth session is already running.", "OAUTH_BUSY")
            return
        }

        guard let rawUrl = call.getString("url"),
              let url = URL(string: rawUrl),
              let callbackScheme = call.getString("callbackScheme"),
              !callbackScheme.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else {
            call.reject("OAuth URL or callback scheme is missing.", "OAUTH_INVALID_INPUT")
            return
        }

        activeCall = call
        activeCallbackScheme = callbackScheme
        let session = ASWebAuthenticationSession(url: url, callbackURLScheme: callbackScheme) { [weak self] callbackUrl, error in
            DispatchQueue.main.async {
                guard let self else { return }

                if let callbackUrl {
                    self.resolveActiveCall(with: callbackUrl)
                    return
                }

                if let authError = error as? ASWebAuthenticationSessionError,
                   authError.code == .canceledLogin {
                    self.rejectActiveCall("OAuth was cancelled.", code: "OAUTH_CANCELLED")
                    return
                }

                self.rejectActiveCall(error?.localizedDescription ?? "OAuth session failed.", code: "OAUTH_SESSION_ERROR")
            }
        }

        session.presentationContextProvider = self
        session.prefersEphemeralWebBrowserSession = false
        activeSession = session

        if !session.start() {
            clearActiveSession()
            call.reject("OAuth session could not start.", "OAUTH_START_FAILED")
        }
    }

    @objc private func handleOpenUrl(notification: NSNotification) {
        guard activeCall != nil,
              let activeCallbackScheme,
              let object = notification.object as? [String: Any?] else {
            return
        }

        let callbackUrl: URL?
        if let url = object["url"] as? URL {
            callbackUrl = url
        } else if let url = object["url"] as? NSURL {
            callbackUrl = url as URL
        } else {
            callbackUrl = nil
        }

        guard let callbackUrl, callbackUrl.scheme == activeCallbackScheme else {
            return
        }

        let session = activeSession
        resolveActiveCall(with: callbackUrl)
        session?.cancel()
    }

    private func resolveActiveCall(with callbackUrl: URL) {
        activeCall?.resolve([
            "url": callbackUrl.absoluteString
        ])
        clearActiveSession()
    }

    private func rejectActiveCall(_ message: String, code: String) {
        activeCall?.reject(message, code)
        clearActiveSession()
    }

    private func clearActiveSession() {
        activeSession = nil
        activeCall = nil
        activeCallbackScheme = nil
    }

    public func presentationAnchor(for session: ASWebAuthenticationSession) -> ASPresentationAnchor {
        if let window = bridge?.viewController?.view.window {
            return window
        }

        return UIApplication.shared.connectedScenes
            .compactMap { $0 as? UIWindowScene }
            .flatMap { $0.windows }
            .first { $0.isKeyWindow } ?? ASPresentationAnchor()
    }
}
