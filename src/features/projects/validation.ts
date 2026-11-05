import type { ProjectInput } from './types'

const NAME_MAX_LENGTH = 100
const DESCRIPTION_MAX_LENGTH = 5_000
const REPOSITORY_URL_MAX_LENGTH = 2_048
const URL_ASCII_PUNCTUATION = "!$&'()*+,-./:;=?@_~%#[]"

type ValidationResult =
  | { valid: true; value: ProjectInput }
  | { valid: false; errors: Partial<Record<keyof ProjectInput, string>> }

function trimText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

export function normalizeProjectName(name: string): string {
  return name.trim().toLowerCase()
}

function isRepositoryUrl(value: string): boolean {
  if (!/^https?:\/\/[^/\\?#]/i.test(value) || /[\s\p{Cc}\\]/u.test(value)) {
    return false
  }

  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0
    if (codePoint < 0x80) {
      if (!(/[A-Za-z0-9]/.test(character) || URL_ASCII_PUNCTUATION.includes(character))) return false
    } else if (codePoint < 0xA0 || codePoint > 0x10FFFD
      || (codePoint >= 0xD800 && codePoint <= 0xDFFF)
      || (codePoint >= 0xFDD0 && codePoint <= 0xFDEF)
      || (codePoint & 0xFFFF) >= 0xFFFE) {
      return false
    }
  }

  try {
    const url = new URL(value)
    return (url.protocol === 'http:' || url.protocol === 'https:') && url.hostname !== ''
  } catch {
    return false
  }
}

export function validateProjectInput(input: ProjectInput): ValidationResult {
  const value: ProjectInput = {
    name: trimText(input?.name),
    description: trimText(input?.description),
    repositoryUrl: trimText(input?.repositoryUrl),
  }
  const errors: Partial<Record<keyof ProjectInput, string>> = {}

  const nameLength = Array.from(value.name).length
  if (nameLength < 1 || nameLength > NAME_MAX_LENGTH) {
    errors.name = 'Enter a project name between 1 and 100 characters.'
  }

  const descriptionLength = Array.from(value.description).length
  if (descriptionLength < 1 || descriptionLength > DESCRIPTION_MAX_LENGTH) {
    errors.description = 'Enter a description between 1 and 5,000 characters.'
  }

  if (
    Array.from(value.repositoryUrl).length > REPOSITORY_URL_MAX_LENGTH ||
    !isRepositoryUrl(value.repositoryUrl)
  ) {
    errors.repositoryUrl = 'Enter an absolute HTTP or HTTPS URL of at most 2,048 characters.'
  }

  return Object.keys(errors).length === 0 ? { valid: true, value } : { valid: false, errors }
}
