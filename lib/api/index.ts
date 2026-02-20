export { ApiError, secureFetch } from './base';
export { fileApi } from './file';
export { tokenApi } from './upload';
export { gatewayApi } from './gateway';
export { shareApi } from './share';
export { propagationApi } from './propagation';
export { downloadApi } from './download';

import { fileApi as _fileApi } from './file';
import { uploadApi as _uploadApi, tokenApi as _tokenApi } from './upload';

export const api = {
  ..._fileApi,
  getToken: _tokenApi.getToken,
};

export { _uploadApi as uploadApi };
