// CSS module declarations for TypeScript
declare module '*.css' {
  const content: Record<string, string>
  export default content
}

// Image asset declarations
declare module '*.svg' {
  const src: string
  export default src
}

declare module '*.png' {
  const src: string
  export default src
}

declare module '*.jpg' {
  const src: string
  export default src
}

declare module '*.webp' {
  const src: string
  export default src
}
