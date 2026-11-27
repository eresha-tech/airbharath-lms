import 'server-only';
import type { Asset } from './service';
import type { MediaStorage } from './provider';
import { downloadable } from './uploads';
import { MediaError } from './model';
import { VIDEO_VERIFICATION_POLICY } from './verification';
import { attachment, privateObjectResponse } from './streaming';

export function sourceDelivery(request: Request, provider: MediaStorage, asset: Asset, authorize: () => Promise<void>, originalVideo = false) {
  if (originalVideo) {
    if (asset.assetKind !== 'video' || asset.status !== 'ready' || !asset.isAttached || !asset.objectVersionId || !asset.checksum || asset.verificationPolicy !== VIDEO_VERIFICATION_POLICY) throw new MediaError('not_ready');
  } else downloadable(asset);
  if (!provider.open || provider.identity.provider !== asset.storageProvider || provider.identity.container !== asset.storageContainer || provider.identity.accountId !== asset.storageAccountId) throw new MediaError('unavailable');
  return privateObjectResponse(request, { size: asset.byteSize, type: originalVideo ? 'video/mp4' : 'application/octet-stream', checksum: asset.checksum!,
    ...(!originalVideo ? { disposition: attachment(asset.displayName, asset.mimeType) } : {}),
    open: (range, signal, head) => provider.open!(asset, range, signal, head),
  }, authorize);
}
