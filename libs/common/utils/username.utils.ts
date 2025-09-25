/**
 * Utility functions for generating unique usernames
 */

/**
 * Generate a unique username from email with fallback strategies
 * @param email - User's email address
 * @param existingUsernames - Array of existing usernames to avoid duplicates
 * @returns A unique username
 */
export function generateUniqueUsername(
    email: string,
    existingUsernames: string[] = [],
): string {
    if (typeof email !== "string" || !email.includes("@")) {
        return generateRandomUsername()
    }

    const baseUsername = extractBaseUsername(email)

    // If base username is not taken, use it
    if (!existingUsernames.includes(baseUsername)) {
        return baseUsername
    }

    // Try with domain suffix
    const domainUsername = generateUsernameWithDomain(email)
    if (!existingUsernames.includes(domainUsername)) {
        return domainUsername
    }

    // Try with numbers
    for (let i = 1; i <= 999; i++) {
        const numberedUsername = `${baseUsername}${i}`
        if (!existingUsernames.includes(numberedUsername)) {
            return numberedUsername
        }
    }

    // Last resort: random username
    return generateRandomUsername()
}

/**
 * Extract base username from email (part before @)
 * @param email - User's email address
 * @returns Base username (max 20 chars)
 */
function extractBaseUsername(email: string): string {
    const atIndex = email.indexOf("@")
    if (atIndex <= 0) return ""

    // Clean and limit to 20 characters
    return email
        .substring(0, atIndex)
        .replace(/[^a-zA-Z0-9_]/g, "") // Remove special chars except underscore
        .toLowerCase()
        .slice(0, 20)
}

/**
 * Generate username with domain suffix
 * @param email - User's email address
 * @returns Username with domain suffix
 */
function generateUsernameWithDomain(email: string): string {
    const [localPart, domain] = email.split("@")
    if (!localPart || !domain) return ""

    const cleanLocal = localPart.replace(/[^a-zA-Z0-9_]/g, "").toLowerCase()
    const cleanDomain = domain
        .split(".")[0]
        .replace(/[^a-zA-Z0-9]/g, "")
        .toLowerCase()

    // Combine and limit to 20 characters
    const combined = `${cleanLocal}_${cleanDomain}`
    return combined.slice(0, 20)
}

/**
 * Generate a random username as last resort
 * @returns Random username
 */
function generateRandomUsername(): string {
    const timestamp = Date.now().toString().slice(-6) // Last 6 digits
    const random = Math.random().toString(36).substring(2, 8) // 6 random chars
    return `user_${timestamp}_${random}`.slice(0, 20)
}

/**
 * Validate username format
 * @param username - Username to validate
 * @returns True if valid
 */
export function isValidUsername(username: string): boolean {
    if (!username || typeof username !== "string") return false

    // Must be 3-20 characters, alphanumeric and underscore only
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/
    return usernameRegex.test(username)
}
