import { showUI } from '@create-figma-plugin/utilities';

import { handleMessage } from './dispatch/handle-message';

export default function () {
  showUI({ width: 300, height: 220 });
  figma.ui.onmessage = (msg) => handleMessage(msg);
}
