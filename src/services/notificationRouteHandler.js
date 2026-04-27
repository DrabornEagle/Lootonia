export function resolveNotificationRoute(payload = {}) {
  const dkd_raw_route = String(
    payload?.targetScreen || payload?.route || payload?.screen || ''
  )
    .trim()
    .toLowerCase();

  const dkd_route_alias_map = {
    social: 'ally',
    chat: 'ally',
    message: 'ally',
    messages: 'ally',
    friend: 'ally',
    friends: 'ally',
  };

  const dkd_route = dkd_route_alias_map[dkd_raw_route] || dkd_raw_route;
  const dkd_drop_id = payload?.targetDropId || payload?.dropId || null;

  return {
    route: dkd_route,
    dropId: dkd_drop_id,
    payload,
  };
}

export function applyNotificationRoute({ route, dropId, payload }, api = {}) {
  if (!route) return false;

  if (route === 'courier') {
    api.openTab?.('map');
    api.openCourier?.();
    return true;
  }

  if (route === 'admin') {
    if (!api.isAdmin) return false;
    api.openAdmin?.();
    return true;
  }

  if (route === 'scanner') {
    api.openTab?.('map');
    if (dropId) api.setDropId?.(String(dropId));
    api.openScanner?.();
    return true;
  }

  if (route === 'ally') {
    api.openTab?.('ally', payload);
    api.openSocial?.();
    return true;
  }

  if (['map', 'collection', 'market', 'tasks', 'leader'].includes(route)) {
    api.openTab?.(route, payload);
    if (dropId) api.setDropId?.(String(dropId));
    return true;
  }

  return false;
}
