// 이 파일은 Gemma 온디바이스 AI 플러그인의 안전한 기본 stub입니다.
import Capacitor
import Foundation

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
    private let modelURL = "https://huggingface.co/litert-community/gemma-4-E2B-it-litert-lm"

    @objc func status(_ call: CAPPluginCall) {
        call.resolve(statusPayload())
    }

    @objc func download(_ call: CAPPluginCall) {
        call.reject("현재 빌드는 온디바이스 AI 엔진을 포함하지 않습니다.", "GEMMA_UNAVAILABLE")
    }

    @objc func remove(_ call: CAPPluginCall) {
        call.resolve(statusPayload())
    }

    @objc func generate(_ call: CAPPluginCall) {
        call.reject("현재 빌드는 온디바이스 AI 엔진을 포함하지 않습니다.", "GEMMA_UNAVAILABLE")
    }

    private func statusPayload() -> [String: Any] {
        return [
            "supported": false,
            "modelName": modelName,
            "fileName": modelFileName,
            "installed": false,
            "sizeBytes": modelSizeBytes,
            "downloadedBytes": 0,
            "downloadURL": modelURL,
            "backend": "unavailable",
            "reason": "LiteRTLMEngine is not linked in this build."
        ]
    }
}
