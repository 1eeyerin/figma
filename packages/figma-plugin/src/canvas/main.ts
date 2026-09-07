import { showUI } from '@create-figma-plugin/utilities';

import { handleMessage } from './dispatch';
import { observeSelection } from './selection';

export default function () {
  showUI({ width: 300, height: 220 });
  figma.ui.onmessage = (msg) => handleMessage(msg);
  const stopObserving = observeSelection();
  figma.on('close', stopObserving);
}
