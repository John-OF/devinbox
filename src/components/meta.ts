import {
  Archive,
  BookOpen,
  CirclePlay,
  FileText,
  FolderGit2,
  GraduationCap,
  Inbox,
  Link,
  Wrench,
  type LucideIcon,
} from 'lucide-react'
import type { ResourceStatus, ResourceType } from '../types/resource.ts'

export const TYPE_META: Record<ResourceType, { label: string; Icon: LucideIcon }> = {
  video: { label: 'Video', Icon: CirclePlay },
  articulo: { label: 'Artículo', Icon: FileText },
  repo: { label: 'Repo', Icon: FolderGit2 },
  curso: { label: 'Curso', Icon: GraduationCap },
  herramienta: { label: 'Herramienta', Icon: Wrench },
  otro: { label: 'Otro', Icon: Link },
}

export const STATUS_META: Record<
  ResourceStatus,
  { label: string; Icon: LucideIcon; moveLabel: string; shortcut?: string }
> = {
  inbox: { label: 'Inbox', Icon: Inbox, moveLabel: 'Devolver a Inbox' },
  reading: { label: 'En Estudio', Icon: BookOpen, moveLabel: 'Mover a Estudio', shortcut: 'S' },
  archived: { label: 'Archivo', Icon: Archive, moveLabel: 'Archivar', shortcut: 'A' },
}

export function cn(...classes: (string | false | null | undefined)[]): string {
  return classes.filter(Boolean).join(' ')
}
