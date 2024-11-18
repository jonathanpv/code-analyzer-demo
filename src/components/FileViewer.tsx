import React, { useEffect, useState } from "react"
import { ChevronRight, File, Folder, LayoutDashboard } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
} from "@/components/ui/sidebar"
import { Node } from '../analyzer/types';

interface FileTreeItem {
  type: 'file' | 'directory';
  name: string;
  content?: string;
  path?: string;
  children?: Record<string, FileTreeItem>;
}

interface FileViewerProps {
  onSymbolClick: (node: Node) => void;
  activeView: 'graph' | 'files';
  setActiveView: (view: 'graph' | 'files') => void;
  onFileSelect: (content: string, path: string) => void;
}

export function FileViewer({ onSymbolClick, activeView, setActiveView, onFileSelect }: FileViewerProps) {
  const [fileTree, setFileTree] = useState<Record<string, FileTreeItem>>({});
  const [selectedFile, setSelectedFile] = useState<string | null>(null);

  useEffect(() => {
    fetchFileTree();
  }, []);

  const fetchFileTree = async () => {
    try {
      const response = await fetch('http://localhost:3001/files');
      const data = await response.json();
      setFileTree(processFileTree(data.fileTree));
    } catch (error) {
      console.error('Failed to fetch file tree:', error);
    }
  };

  const processFileTree = (tree: any): Record<string, FileTreeItem> => {
    const processed: Record<string, FileTreeItem> = {};
    
    Object.entries(tree).forEach(([key, value]: [string, any]) => {
      if (value.type === 'file') {
        processed[key] = {
          type: 'file',
          name: key,
          content: value.content,
          path: value.path
        };
      } else {
        processed[key] = {
          type: 'directory',
          name: key,
          children: processFileTree(value)
        };
      }
    });

    return processed;
  };

  const handleFileClick = (file: FileTreeItem) => {
    if (file.type === 'file' && file.path) {
      setSelectedFile(file.path);
      onFileSelect(file.content || '', file.path);
    }
  };

  const renderTree = (items: Record<string, FileTreeItem>, path: string = '') => {
    return Object.entries(items).map(([name, item]) => {
      const fullPath = path ? `${path}/${name}` : name;

      if (item.type === 'directory') {
        return (
          <SidebarMenuItem key={fullPath}>
            <Collapsible className="group/collapsible [&[data-state=open]>button>svg:first-child]:rotate-90">
              <CollapsibleTrigger asChild>
                <SidebarMenuButton>
                  <ChevronRight className="transition-transform" />
                  <Folder />
                  {name}
                </SidebarMenuButton>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <SidebarMenuSub>
                  {item.children && renderTree(item.children, fullPath)}
                </SidebarMenuSub>
              </CollapsibleContent>
            </Collapsible>
          </SidebarMenuItem>
        );
      }

      return (
        <SidebarMenuItem key={fullPath}>
          <SidebarMenuButton
            onClick={() => handleFileClick(item)}
            isActive={selectedFile === item.path}
          >
            <File />
            {name}
          </SidebarMenuButton>
        </SidebarMenuItem>
      );
    });
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg">
              <LayoutDashboard className="mr-2 h-4 w-4" />
              <span className="font-semibold">Code Analyzer</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Project Files</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {renderTree(fileTree)}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setActiveView('files')}
              isActive={activeView === 'files'}
            >
              Files
            </SidebarMenuButton>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <SidebarMenuButton
              onClick={() => setActiveView('graph')}
              isActive={activeView === 'graph'}
            >
              Dependency Graph
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}