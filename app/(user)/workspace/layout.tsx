import '@/components/workspace/ui/workspace-ui.css';
export default function WorkspacePublicLayout({ children }: { children: React.ReactNode }) {
  return <div className="workspace-ui">{children}</div>;
}
