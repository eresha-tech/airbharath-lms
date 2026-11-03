import { createHash, randomBytes } from 'node:crypto';
import { expect, it } from 'vitest';
import { fileChecksum } from '@/lib/workspace/media/file-checksum';
import { playlistReferences, outputName, processingConfig } from '@/lib/workspace/media/processing-provider';
import { validatedCaption } from '@/lib/workspace/media/captions';
import { uploadFixture } from './workspace-media-upload-fixtures';
it.each([0,1,55,56,63,64,65,127,1024*1024+37])('streams SHA-256 correctly across padding/chunk boundaries (%i bytes)',async(size)=>{
  const bytes=randomBytes(size); expect(await fileChecksum(new Blob([bytes]))).toBe(createHash('sha256').update(bytes).digest('hex'));
});
it('cancels integrity checking',async()=>{const c=new AbortController();c.abort();await expect(fileChecksum(new Blob(['hello']),c.signal)).rejects.toThrow();});
it('rejects unsafe HLS references instead of proxying external content',()=>{
  expect(playlistReferences('#EXTM3U\n#EXT-X-STREAM-INF:BANDWIDTH=100\nmaster_720.m3u8\n')).toEqual(['master_720.m3u8']);
  for(const name of ['../source','https://example.com/a.ts','master.m3u8?x=1','/master_720.ts','%2e%2e.ts']) expect(()=>outputName(name)).toThrow();
  for(const line of ['#EXT-X-KEY:URI="https://example.com"','#EXT-X-MEDIA:TYPE=AUDIO,URI="x"']) expect(()=>playlistReferences(`#EXTM3U\n${line}\nmaster_720.m3u8`)).toThrow();
});
it('accepts MediaConvert numbered segments but rejects malformed separators and paths',()=>{
  expect(outputName('master_720_00001.ts')).toBe('master_720_00001.ts');
  expect(playlistReferences('#EXTM3U\n#EXT-X-MEDIA-SEQUENCE:1\n#EXTINF:4,\nmaster_720_00001.ts\n#EXT-X-ENDLIST\n')).toEqual(['master_720_00001.ts']);
  for(const name of ['master_720_../00001.ts','master_720__00001.ts','master_720_abc.ts','master_720_00001.ts?x=1']) expect(()=>outputName(name)).toThrow();
});
it('fails closed on ambient/LMS processing configuration',()=>{expect(()=>processingConfig({AWS_REGION:'us-east-1',AWS_ACCESS_KEY_ID:'fake',AWS_SECRET_ACCESS_KEY:'fake'})).toThrow('unavailable');});
it('validates plain WebVTT and rejects markup, CSS, bad times and checksums',async()=>{
  const f=uploadFixture(), {asset}=await f.reserve(); const a=f.state.rows.find(a=>a.id===asset.id)!;
  const valid='WEBVTT\n\n00:00:00.000 --> 00:00:02.000\nAviation basics\n';
  const verify=(text:string,digest?:string)=>{const bytes=new TextEncoder().encode(text);return validatedCaption({...a,assetKind:'caption',byteSize:bytes.length},bytes,digest||createHash('sha256').update(bytes).digest('hex'));};
  expect(verify(valid)).toBe(valid);
  for(const invalid of [valid.replace('Aviation basics','<script>x</script>'),valid.replace('Aviation basics','<b>text</b>'),valid.replace('00:00:02.000','00:00:00.000'),'WEBVTT\n\nSTYLE\n::cue { color:red }\n']) expect(()=>verify(invalid)).toThrow('verification');
  expect(()=>verify(valid,'a'.repeat(64))).toThrow('verification');
});
