import { boot } from 'quasar/wrappers';
import { Notify, type QNotifyCreateOptions } from 'quasar';

export default boot(() => {
  Notify.setDefaults({
    position: 'top',
    timeout: 2200,
    classes: 'ej-notify',
  });

  const create = Notify.create.bind(Notify);
  let lastMessage = '';
  let lastAt = 0;
  Notify.create = ((opts?: QNotifyCreateOptions | string) => {
    const message = typeof opts === 'string' ? opts : String(opts?.message ?? '');
    const now = Date.now();
    if (message && message === lastMessage && now - lastAt < 1600) {
      return () => undefined;
    }
    lastMessage = message;
    lastAt = now;
    return create(opts as QNotifyCreateOptions);
  }) as typeof Notify.create;
});
