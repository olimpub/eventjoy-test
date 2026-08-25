import { boot } from 'quasar/wrappers';
import { Notify } from 'quasar';

export default boot(() => {
  Notify.setDefaults({
    position: 'top',
    timeout: 2200,
    classes: 'ej-notify',
  });
});
