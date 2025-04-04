"use client"

import { PasswordField } from "./password-field"

export function SettingsAccount() {
    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold">Change password</h2>
            <PasswordField />
        </div>
    )
}
