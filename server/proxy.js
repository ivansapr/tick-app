// Trust a bounded number of proxy hops, or explicit proxy IPs/CIDRs.
// Never use `true`: that lets arbitrary forwarded IPs bypass rate limits.
export function configureProxy(app, value = process.env.TRUST_PROXY) {
  const setting = value?.trim();
  if (!setting || setting === 'false' || setting === '0') return;
  if (setting === 'true') throw new Error('TRUST_PROXY must be a hop count or proxy IP/CIDR list, not true');
  if (/^\d+$/.test(setting)) app.set('trust proxy', Number(setting));
  else app.set('trust proxy', setting.split(',').map(part => part.trim()));
}
