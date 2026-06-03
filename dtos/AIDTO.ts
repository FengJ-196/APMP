export interface DiagramToMermaidRequestDTO {
  fileId: string;
}

export interface DiagramToMermaidResponseDTO {
  mermaidCode: string;
  confidence: number;
  explanation?: string;
}

export interface ReformatMarkdownRequestDTO {
  text: string;
}

export interface ReformatMarkdownResponseDTO {
  markdown: string;
  confidence: number;
}
