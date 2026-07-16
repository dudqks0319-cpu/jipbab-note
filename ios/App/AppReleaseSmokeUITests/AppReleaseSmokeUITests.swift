import XCTest

final class AppReleaseSmokeUITests: XCTestCase {
    private var app: XCUIApplication!

    override func setUpWithError() throws {
        continueAfterFailure = false
    }

    override func tearDownWithError() throws {
        app = nil
    }

    func testAutomationModeProbe() throws {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        XCTAssertTrue(springboard.wait(for: .runningForeground, timeout: 15), "SpringBoard did not become available to XCTest.")
        attachScreenshot(of: springboard, named: "00-automation-mode-probe")
    }

    func testCableLaunchAndPrimaryTabs() throws {
        app = XCUIApplication()
        app.launchArguments.append("--release-smoke-ui-test")
        app.launch()

        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 45), "The production Capacitor WebView did not appear on the iPhone.")

        attachScreenshot(of: app, named: "01-home")

        tapBottomTab(index: 1, total: 5)
        waitForStableWebView()
        attachScreenshot(of: app, named: "02-fridge-tab")

        tapBottomTab(index: 2, total: 5)
        waitForStableWebView()
        attachScreenshot(of: app, named: "03-recipe-tab")

        tapBottomTab(index: 3, total: 5)
        waitForStableWebView()
        attachScreenshot(of: app, named: "04-shopping-tab")

        tapBottomTab(index: 4, total: 5)
        waitForStableWebView()
        attachScreenshot(of: app, named: "05-mypage-tab")
    }

    func testShoppingExternalLinkHandoff() throws {
        app = XCUIApplication()
        app.launchArguments.append("--release-smoke-ui-test")
        app.launch()

        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 45), "The production Capacitor WebView did not appear on the iPhone.")

        tapBottomTab(index: 3, total: 5)
        waitForStableWebView()
        attachScreenshot(of: app, named: "06-shopping-before-external-link")

        tapFirstShoppingPurchaseLink()
        waitForExternalLinkSurface()
    }

    func testNotificationPreparationFromSettings() throws {
        app = XCUIApplication()
        app.launchArguments.append("--release-smoke-ui-test")
        app.launch()

        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 45), "The production Capacitor WebView did not appear on the iPhone.")

        addFutureExpiryIngredientForNotification()

        tapBottomTab(index: 4, total: 5)
        waitForStableWebView()
        attachScreenshot(of: app, named: "08-mypage-before-notification-settings")

        tapTopActionButton(indexFromRight: 1)
        waitForStableWebView()
        attachScreenshot(of: app, named: "09-notification-settings-before-schedule")

        tapNotificationPreparationButton()
        allowNotificationPermissionIfNeeded()
        RunLoop.current.run(until: Date().addingTimeInterval(3.0))
        attachScreenshot(of: app, named: "10-notification-settings-after-schedule")

        let successText = app.staticTexts.matching(NSPredicate(format: "label MATCHES %@", ".*[1-9][0-9]*개 알림을 준비.*")).firstMatch
        let fallbackText = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "알림을 예약하지 못했습니다")).firstMatch
        XCTAssertTrue(
            successText.waitForExistence(timeout: 5),
            "Notification scheduling did not produce a visible non-zero scheduled notification message. Failure message visible: \(fallbackText.exists)."
        )
    }

    func testCoreLoopRecipeRecommendationToShoppingList() throws {
        app = XCUIApplication()
        app.launchArguments.append("--release-smoke-ui-test")
        app.launch()

        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 45), "The production Capacitor WebView did not appear on the iPhone.")

        seedStarterIngredientsFromHomeIfNeeded()
        attachScreenshot(of: app, named: "11-core-loop-home-recommendation")

        tapHomeMissingIngredientsLink()
        waitForStableWebView()
        attachScreenshot(of: app, named: "12-core-loop-recipe-shopping-assistant")

        tapAddMissingIngredientsOrAcceptExistingShoppingItems()
        waitForStableWebView()
        attachScreenshot(of: app, named: "13-core-loop-after-shopping-add")

        tapBottomTab(index: 3, total: 5)
        waitForStableWebView()
        attachScreenshot(of: app, named: "14-core-loop-shopping-list")

        let shoppingTitle = app.staticTexts["장보기 리스트"]
        XCTAssertTrue(shoppingTitle.waitForExistence(timeout: 8), "The shopping list screen did not appear after the recipe-to-shopping core loop.")
    }

    func testOAuthProviderCompletionProbe() throws {
        try runOAuthProviderCompletionProbe(provider: "google")
    }

    func testAppleOAuthProviderCompletionProbe() throws {
        try runOAuthProviderCompletionProbe(provider: "apple")
    }

    func testKakaoOAuthProviderCompletionProbe() throws {
        try runOAuthProviderCompletionProbe(provider: "kakao")
    }

    func testAccountDeletionScreenProbe() throws {
        app = XCUIApplication()
        app.launchArguments.append("--release-smoke-ui-test")
        app.launch()

        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 45), "The production Capacitor WebView did not appear on the iPhone.")

        tapBottomTab(index: 4, total: 5)
        waitForStableWebView()
        if !isAuthenticatedMypageVisible() {
            try runOAuthProviderCompletionProbe(provider: "google")
        }

        tapAccountDeletionLink()
        waitForStableWebView()
        attachScreenshot(of: app, named: "19-account-deletion-screen")

        let title = app.staticTexts["계정 삭제"]
        let confirmField = app.textFields.firstMatch
        let deleteButton = app.buttons["계정 바로 삭제"]
        XCTAssertTrue(title.waitForExistence(timeout: 8), "The account deletion title was not visible.")
        XCTAssertTrue(confirmField.waitForExistence(timeout: 8), "The account deletion confirmation field was not visible.")
        XCTAssertTrue(deleteButton.waitForExistence(timeout: 8), "The direct account deletion button was not visible.")
        confirmField.tap()
        confirmField.typeText("삭")
        dismissKeyboardIfNeeded()
        attachScreenshot(of: app, named: "20-account-deletion-ready-not-submitted")
    }

    private func runOAuthProviderCompletionProbe(provider: String) throws {
        let providerButtonLabel = oauthButtonLabel(for: provider)
        app = XCUIApplication()
        app.launchArguments.append("--release-smoke-ui-test")
        app.launch()

        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 45), "The production Capacitor WebView did not appear on the iPhone.")

        tapBottomTab(index: 4, total: 5)
        waitForStableWebView()
        attachScreenshot(of: app, named: "15-oauth-\(provider)-mypage-before-login")

        signOutIfAuthenticated()
        tapLoginFromMypageIfNeeded()
        waitForStableWebView()
        attachScreenshot(of: app, named: "16-oauth-\(provider)-login-screen")

        let providerButton = app.buttons[providerButtonLabel]
        XCTAssertTrue(providerButton.waitForExistence(timeout: 8), "OAuth provider button was not visible: \(providerButtonLabel)")
        providerButton.tap()
        RunLoop.current.run(until: Date().addingTimeInterval(8.0))
        attachScreenshot(of: app, named: "17-oauth-\(provider)-after-provider-tap")

        continueOAuthConsentIfClearlyAvailable()
        continueProviderLoginIfClearlyAvailable(provider: provider)
        let completionWaitSeconds = provider == "apple" ? 25.0 : 10.0
        RunLoop.current.run(until: Date().addingTimeInterval(completionWaitSeconds))
        attachScreenshot(of: app, named: "18-oauth-\(provider)-completion-check")

        let connected = app.staticTexts["연결됨"].exists
        let mypageTitle = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "현재 로그인")).firstMatch.exists
        XCTAssertTrue(
            connected || mypageTitle,
            "OAuth provider \(provider) did not complete into an authenticated mypage session without additional user-owned credential input."
        )
    }

    private func isAuthenticatedMypageVisible() -> Bool {
        let connected = app.staticTexts["연결됨"]
        if connected.waitForExistence(timeout: 5) {
            return true
        }

        let currentLogin = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@", "현재 로그인")).firstMatch
        return currentLogin.waitForExistence(timeout: 2)
    }

    private func signOutIfAuthenticated() {
        if !isAuthenticatedMypageVisible() {
            return
        }

        let logoutButton = app.buttons["로그아웃"]
        if logoutButton.waitForExistence(timeout: 2), logoutButton.isHittable {
            logoutButton.tap()
            RunLoop.current.run(until: Date().addingTimeInterval(2.0))
            return
        }

        for _ in 0..<4 {
            app.swipeUp()
            RunLoop.current.run(until: Date().addingTimeInterval(0.8))
            if logoutButton.exists && logoutButton.isHittable {
                logoutButton.tap()
                RunLoop.current.run(until: Date().addingTimeInterval(2.0))
                return
            }
        }
    }

    private func tapAccountDeletionLink() {
        let link = app.links["계정 삭제"]
        if link.waitForExistence(timeout: 5), link.isHittable {
            link.tap()
            return
        }

        let button = app.buttons["계정 삭제"]
        if button.waitForExistence(timeout: 2), button.isHittable {
            button.tap()
            return
        }

        for _ in 0..<4 {
            app.swipeUp()
            RunLoop.current.run(until: Date().addingTimeInterval(0.8))

            if link.exists && link.isHittable {
                link.tap()
                return
            }

            if button.exists && button.isHittable {
                button.tap()
                return
            }
        }

        XCTFail("The account deletion link was not visible on mypage.")
    }

    private func tapBottomTab(index: Int, total: Int) {
        let labels = ["홈", "냉장고", "레시피", "장보기", "마이"]
        if labels.indices.contains(index) {
            let tabLink = app.links[labels[index]]
            if tabLink.waitForExistence(timeout: 3), tabLink.isHittable {
                tabLink.tap()
                return
            }

            let tabButton = app.buttons[labels[index]]
            if tabButton.waitForExistence(timeout: 1), tabButton.isHittable {
                tabButton.tap()
                return
            }
        }

        let window = app.windows.firstMatch
        let frame = window.frame
        let x = frame.minX + frame.width * ((CGFloat(index) + 0.5) / CGFloat(total))
        let y = frame.maxY - 62
        window.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y)).tap()
    }

    private func tapTopActionButton(indexFromRight: Int) {
        let window = app.windows.firstMatch
        let frame = window.frame
        let x = frame.maxX - CGFloat(36 + (indexFromRight * 48))
        let y = frame.minY + 72
        window.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y)).tap()
    }

    private func tapFirstShoppingPurchaseLink() {
        let linkPredicate = NSPredicate(format: "label CONTAINS %@ OR label CONTAINS %@", "구매", "열기")
        let accessibleLink = app.links.matching(linkPredicate).firstMatch
        if accessibleLink.waitForExistence(timeout: 3) {
            accessibleLink.tap()
            return
        }

        let buttonPredicate = NSPredicate(format: "label CONTAINS %@ OR label CONTAINS %@", "구매", "열기")
        let accessibleButton = app.buttons.matching(buttonPredicate).firstMatch
        if accessibleButton.waitForExistence(timeout: 2) {
            accessibleButton.tap()
            return
        }

        let window = app.windows.firstMatch
        let frame = window.frame
        let x = frame.minX + frame.width * 0.76
        let y = frame.minY + frame.height * 0.87
        window.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y)).tap()
    }

    private func waitForExternalLinkSurface() {
        let safari = XCUIApplication(bundleIdentifier: "com.apple.mobilesafari")
        if safari.wait(for: .runningForeground, timeout: 10) {
            attachScreenshot(of: safari, named: "07-shopping-external-link-safari")
            return
        }

        let doneButton = app.buttons["Done"].exists || app.buttons["완료"].exists
        attachScreenshot(of: app, named: "07-shopping-external-link-in-app-browser")
        XCTAssertTrue(doneButton, "The shopping purchase link did not open Safari or an in-app browser surface.")
    }

    private func tapNotificationPreparationButton() {
        let exactButton = app.buttons["유통기한 알림 준비"]
        if exactButton.waitForExistence(timeout: 3) {
            exactButton.tap()
            return
        }

        let busyButton = app.buttons["알림 준비 중"]
        if busyButton.waitForExistence(timeout: 1) {
            return
        }

        app.swipeUp()
        RunLoop.current.run(until: Date().addingTimeInterval(1.0))
        let visibleButton = app.buttons["유통기한 알림 준비"]
        if visibleButton.waitForExistence(timeout: 2) {
            visibleButton.tap()
            return
        }

        let window = app.windows.firstMatch
        let frame = window.frame
        let x = frame.midX
        let y = frame.minY + frame.height * 0.64
        window.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y)).tap()
    }

    private func seedStarterIngredientsFromHomeIfNeeded() {
        let starterButton = app.buttons["5개 바로 담기"]
        if starterButton.waitForExistence(timeout: 3) {
            starterButton.tap()
            RunLoop.current.run(until: Date().addingTimeInterval(3.0))
        }
    }

    private func tapHomeMissingIngredientsLink() {
        let linkPredicate = NSPredicate(format: "label CONTAINS %@", "부족 재료")
        let missingLink = app.links.matching(linkPredicate).firstMatch
        if missingLink.waitForExistence(timeout: 5) {
            missingLink.tap()
            return
        }

        let buttonPredicate = NSPredicate(format: "label CONTAINS %@", "부족 재료")
        let missingButton = app.buttons.matching(buttonPredicate).firstMatch
        if missingButton.waitForExistence(timeout: 2) {
            missingButton.tap()
            return
        }

        let window = app.windows.firstMatch
        let frame = window.frame
        let x = frame.minX + frame.width * 0.72
        let y = frame.minY + frame.height * 0.32
        window.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y)).tap()
    }

    private func oauthButtonLabel(for provider: String) -> String {
        switch provider {
        case "apple":
            return "Apple로 로그인"
        case "kakao":
            return "카카오 로그인"
        default:
            return "Google로 계속하기"
        }
    }

    private func tapLoginFromMypageIfNeeded() {
        let loginLink = app.links["로그인"]
        if loginLink.waitForExistence(timeout: 5) {
            loginLink.tap()
            return
        }

        let loginButton = app.buttons["로그인"]
        if loginButton.waitForExistence(timeout: 2) {
            loginButton.tap()
            return
        }
    }

    private func continueOAuthConsentIfClearlyAvailable() {
        let labels = [
            "Continue",
            "계속",
            "동의",
            "동의하고 계속하기",
            "확인",
            "Allow",
            "허용",
        ]

        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let springboardAlert = springboard.alerts.firstMatch
        if springboardAlert.waitForExistence(timeout: 3) {
            for label in labels {
                let button = springboardAlert.buttons[label]
                if button.exists && button.isHittable {
                    button.tap()
                    return
                }
            }
        }

        let appAlert = app.alerts.firstMatch
        if appAlert.waitForExistence(timeout: 1) {
            for label in labels {
                let button = appAlert.buttons[label]
                if button.exists && button.isHittable {
                    button.tap()
                    return
                }
            }
        }

        for label in labels {
            let button = app.buttons[label]
            if button.waitForExistence(timeout: 2), button.isHittable {
                button.tap()
                return
            }
        }
    }

    private func continueProviderLoginIfClearlyAvailable(provider: String) {
        let labels: [String]
        switch provider {
        case "kakao":
            labels = ["카카오톡으로 로그인", "열기"]
        default:
            labels = []
        }

        for _ in 0..<3 {
            var tapped = false
            for label in labels {
                if tapVisibleButton(label: label) {
                    RunLoop.current.run(until: Date().addingTimeInterval(3.0))
                    tapped = true
                }
            }

            if !tapped {
                return
            }
        }
    }

    private func tapVisibleButton(label: String) -> Bool {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let springboardButton = springboard.buttons[label]
        if springboardButton.waitForExistence(timeout: 1), springboardButton.isHittable {
            springboardButton.tap()
            return true
        }

        let appAlertButton = app.alerts.firstMatch.buttons[label]
        if appAlertButton.waitForExistence(timeout: 1), appAlertButton.isHittable {
            appAlertButton.tap()
            return true
        }

        let button = app.buttons[label]
        if button.waitForExistence(timeout: 2), button.isHittable {
            button.tap()
            return true
        }

        return false
    }

    private func tapAddMissingIngredientsOrAcceptExistingShoppingItems() {
        let addPredicate = NSPredicate(format: "label MATCHES %@", ".*개 장보기에 추가")
        let existingPredicate = NSPredicate(format: "label CONTAINS %@", "선택할 새 재료 없음")

        for _ in 0..<8 {
            let addButton = app.buttons.matching(addPredicate).firstMatch
            if addButton.exists && addButton.isHittable {
                addButton.tap()
                let successText = app.staticTexts.matching(NSPredicate(format: "label CONTAINS %@ OR label CONTAINS %@", "장보기에", "이미 장보기에")).firstMatch
                XCTAssertTrue(successText.waitForExistence(timeout: 8), "The recipe shopping assistant did not show an add-to-shopping result.")
                return
            }

            let noNewButton = app.buttons.matching(existingPredicate).firstMatch
            if noNewButton.exists {
                return
            }

            app.swipeUp()
            RunLoop.current.run(until: Date().addingTimeInterval(0.8))
        }

        XCTFail("The add-to-shopping button in the recipe shopping assistant was not visible.")
    }

    private func addFutureExpiryIngredientForNotification() {
        tapBottomTab(index: 1, total: 5)
        waitForStableWebView()
        attachScreenshot(of: app, named: "08a-fridge-before-notification-seed")

        let addButton = app.buttons["재료 바로 추가"].exists ? app.buttons["재료 바로 추가"] : app.buttons["재료 추가"]
        XCTAssertTrue(addButton.waitForExistence(timeout: 5), "The fridge add ingredient button was not visible.")
        addButton.tap()

        let nameField = app.textFields["예: 돼지고기 목살"]
        XCTAssertTrue(nameField.waitForExistence(timeout: 5), "The fridge ingredient name field was not visible.")
        nameField.tap()
        nameField.typeText("감자 QA \(Int(Date().timeIntervalSince1970))")
        dismissKeyboardIfNeeded()

        tapOneWeekExpiryQuickOption()

        tapButtonScrollingIfNeeded(label: "저장하고 계속 추가 ✨", failureMessage: "The fridge save button was not visible.")
        RunLoop.current.run(until: Date().addingTimeInterval(3.0))
        attachScreenshot(of: app, named: "08b-fridge-after-notification-seed")

        let closeButton = app.buttons["모달 닫기"]
        if closeButton.waitForExistence(timeout: 3) {
            closeButton.tap()
            RunLoop.current.run(until: Date().addingTimeInterval(1.0))
        }
    }

    private func dismissKeyboardIfNeeded() {
        let doneButton = app.toolbars.buttons["Done"]
        if doneButton.waitForExistence(timeout: 2) {
            doneButton.tap()
            RunLoop.current.run(until: Date().addingTimeInterval(1.0))
            return
        }

        let returnButton = app.keyboards.buttons["Return 키"]
        if returnButton.exists {
            returnButton.tap()
            RunLoop.current.run(until: Date().addingTimeInterval(1.0))
        }
    }

    private func tapButtonScrollingIfNeeded(label: String, failureMessage: String) {
        let button = app.buttons[label]
        for _ in 0..<6 {
            if button.exists && button.isHittable {
                button.tap()
                return
            }
            app.swipeUp()
            RunLoop.current.run(until: Date().addingTimeInterval(0.8))
        }

        XCTAssertTrue(button.exists && button.isHittable, failureMessage)
    }

    private func tapOneWeekExpiryQuickOption() {
        for _ in 0..<3 {
            app.swipeUp()
            RunLoop.current.run(until: Date().addingTimeInterval(0.8))
        }

        let window = app.windows.firstMatch
        let frame = window.frame
        let x = frame.minX + frame.width * 0.58
        let y = frame.minY + frame.height * 0.39
        window.coordinate(withNormalizedOffset: .zero).withOffset(CGVector(dx: x, dy: y)).tap()
        RunLoop.current.run(until: Date().addingTimeInterval(1.0))
        attachScreenshot(of: app, named: "08c-fridge-notification-seed-expiry-selected")
    }

    private func allowNotificationPermissionIfNeeded() {
        let springboard = XCUIApplication(bundleIdentifier: "com.apple.springboard")
        let alert = springboard.alerts.firstMatch
        if !alert.waitForExistence(timeout: 3) {
            return
        }

        let allowedLabels = ["Allow", "허용", "허용 안 함", "Don’t Allow", "Don't Allow"]
        for label in allowedLabels {
            let button = alert.buttons[label]
            if button.exists {
                button.tap()
                return
            }
        }
    }

    private func waitForStableWebView() {
        let webView = app.webViews.firstMatch
        XCTAssertTrue(webView.waitForExistence(timeout: 20), "The WebView disappeared after a tab tap.")
        RunLoop.current.run(until: Date().addingTimeInterval(2.0))
    }

    private func attachScreenshot(of application: XCUIApplication, named name: String) {
        let attachment = XCTAttachment(screenshot: application.screenshot())
        attachment.name = name
        attachment.lifetime = .keepAlways
        add(attachment)
    }
}
