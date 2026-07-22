import SwiftUI

struct LoginView: View {
    @Environment(SessionStore.self) private var session
    @Environment(\.dismiss) private var dismiss
    @State private var username = ""
    @State private var password = ""
    @State private var isSubmitting = false

    var body: some View {
        NavigationStack {
            Form {
                Section("账号") {
                    TextField("用户名", text: $username).textContentType(.username).textInputAutocapitalization(.never)
                    SecureField("密码", text: $password).textContentType(.password)
                }
                if let message = session.errorMessage { Section { Text(message).foregroundStyle(.red) } }
                Section {
                    Button {
                        Task {
                            isSubmitting = true
                            await session.login(username: username.trimmingCharacters(in: .whitespacesAndNewlines), password: password)
                            isSubmitting = false
                            if session.isAuthenticated { dismiss() }
                        }
                    } label: {
                        HStack { Spacer(); if isSubmitting { ProgressView() } else { Text("登录") }; Spacer() }
                    }.disabled(username.isEmpty || password.isEmpty || isSubmitting)
                }
            }
            .navigationTitle("账号登录")
            .toolbar { ToolbarItem(placement: .cancellationAction) { Button("取消") { dismiss() } } }
        }
    }
}
