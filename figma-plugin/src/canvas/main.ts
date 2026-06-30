import { showUI } from '@create-figma-plugin/utilities';

import { handleMessage } from './handlers';

export default function () {
  showUI({ width: 300, height: 220 });
  figma.ui.onmessage = (msg) => handleMessage(msg);
}
