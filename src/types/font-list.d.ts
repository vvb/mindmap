declare module 'font-list' {
  export function getFonts(): Promise<string[]>
  export function getFontsSync(): string[]
}
