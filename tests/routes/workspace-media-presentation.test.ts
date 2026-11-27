import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { VideoUploader } from '@/components/admin/VideoUploader';
import { HlsPlayer } from '@/components/video-player/HlsPlayer';
import { FileDropzone, UploadStatus } from '@/components/media/UploadStatus';
it('keeps Admin upload selection and persisted ready/failed/processing presentation renderable',()=>{
 for(const existingStatus of [undefined,'ready','failed','processing']){const html=renderToStaticMarkup(createElement(VideoUploader,{courseId:'synthetic-course',lessonId:'synthetic-lesson',lessonTitle:'Synthetic lesson',onDone:()=>{},...(existingStatus?{existingVideoId:'synthetic-video',existingStatus}:{})}));expect(html.length).toBeGreaterThan(100);expect(html).not.toContain('/api/workspace/media');}
});
it('keeps LMS HLS/caption controls renderable independently of Creator private playback',()=>{const html=renderToStaticMarkup(createElement(HlsPlayer,{videoId:'synthetic-video',captionAvailable:true,captionUrl:'/api/synthetic/captions',lessonTitle:'Synthetic lesson'}));expect(html).toContain('<video');expect(html).not.toContain('/api/workspace/media');});
it('provides keyboard file selection and distinguishes verified sources from playable output',()=>{const html=renderToStaticMarkup(createElement(FileDropzone,{disabled:false,onFiles:()=>{},onChoose:()=>{},children:'MP4 lesson video'}));expect(html).toContain('Choose file');expect(html).toContain('type="button"');expect(renderToStaticMarkup(createElement(UploadStatus,{stage:'verified'}))).toContain('Upload verified');expect(renderToStaticMarkup(createElement(UploadStatus,{stage:'ready'}))).toContain('Ready for playback');});
