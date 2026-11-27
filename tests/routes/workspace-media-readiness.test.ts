import { expect,it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { MarkdownContent } from '@/components/content/MarkdownContent';
import { lessonReadiness,structureReadiness } from '@/lib/workspace/builder/readiness';
import { uploadFixture } from './workspace-media-upload-fixtures';
it('private Markdown uses the existing renderer without external image or navigation requests',()=>{
 const html=renderToStaticMarkup(createElement(MarkdownContent,{privateWorkspace:true,content:'# Heading\n\n**Bold** ![private](https://tracker.invalid/x) [link](https://tracker.invalid/y)'}));
 expect(html).toContain('Heading');expect(html).toContain('<strong');expect(html).not.toContain('<img');expect(html).not.toContain('href=');expect(html).not.toContain('tracker.invalid');
 const regular=renderToStaticMarkup(createElement(MarkdownContent,{content:'[link](https://example.com)'}));expect(regular).toContain('href="https://example.com"');
});
it('reports authoring issues without inventing publication approval',async()=>{
 expect(structureReadiness({modules:[],lessons:[]})).toHaveLength(1);
 expect(lessonReadiness({content:'Plain text remains supported'},[])).toEqual([]);
 const f=uploadFixture(),{asset}=await f.reserve();expect(lessonReadiness({content:''},[asset])).toHaveLength(2);
});
