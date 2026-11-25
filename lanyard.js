'use strict';

/* Live Discord presence for the maintainer card.
   Lanyard (https://github.com/Phineas/lanyard) only answers for accounts that joined
   discord.gg/lanyard. A 404, a timeout or a blocked network leaves the written card in
   index.html exactly as it is, so the page never invents a presence. */

(function () {
  const card = document.querySelector('[data-dev-card]');
  if (!card) return;

  const USER_ID = '1318483518262743072';
  const REST = 'https://api.lanyard.rest/v1/users/';
  const STATUS = { online: 'Online', idle: 'Idle', dnd: 'Do not disturb', offline: 'Offline' };
  const VERB = { 0: 'Playing', 1: 'Streaming', 2: 'Listening to', 3: 'Watching', 5: 'Competing in' };
  const INVISIBLE = /[\u1100-\u11ff\u200b-\u200f\u202a-\u202e\u2060-\u206f\u2800\u3164\ua960-\ua97f\ud7b0-\ud7ff\ufe00-\ufe0f\uffa0]/g;

  const slot = (name) => card.querySelector('[data-dev-slot="' + name + '"]');
  const ui = {
    avatar: slot('avatar'),
    initials: slot('initials'),
    dot: slot('dot'),
    name: slot('name'),
    handle: slot('handle'),
    live: card.querySelector('[data-dev-live]'),
    liveState: card.querySelector('[data-dev-status]'),
    liveActivity: card.querySelector('[data-dev-activity]'),
  };

  let avatarPainted = false;

  function visible(value) {
    return String(value || '').replace(INVISIBLE, '').trim();
  }

  // Spotify is shown as the track itself; every other activity keeps Discord's verb.
  function activityLine(presence) {
    if (presence.listening_to_spotify && presence.spotify) {
      const track = [presence.spotify.song, presence.spotify.artist].filter(Boolean).join(' — ');
      return track ? 'Spotify · ' + track : '';
    }
    const activity = (presence.activities || []).find((item) => item && item.type !== 4 && visible(item.name));
    if (!activity) return '';
    const detail = visible(activity.details || activity.state);
    return (VERB[activity.type] || 'Playing') + ' ' + visible(activity.name) + (detail ? ' · ' + detail : '');
  }

  function customStatus(presence) {
    const activity = (presence.activities || []).find((item) => item && item.type === 4);
    if (!activity) return '';
    const emoji = activity.emoji && activity.emoji.name ? activity.emoji.name + ' ' : '';
    return (emoji + visible(activity.state)).trim();
  }

  function paintAvatar(user) {
    if (avatarPainted || !ui.avatar || !user || !user.avatar) return;
    const animated = String(user.avatar).startsWith('a_') &&
      !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const img = document.createElement('img');
    img.alt = '';
    img.width = 54;
    img.height = 54;
    img.decoding = 'async';
    img.src = 'https://cdn.discordapp.com/avatars/' + user.id + '/' + user.avatar + '.' +
      (animated ? 'gif' : 'png') + '?size=128';
    img.addEventListener('load', () => {
      avatarPainted = true;
      if (ui.initials) ui.initials.hidden = true;
    });
    img.addEventListener('error', () => {
      img.remove();
      if (ui.initials) ui.initials.hidden = false;
    });
    ui.avatar.prepend(img);
  }

  function paint(presence) {
    const user = presence && presence.discord_user;
    if (!user) return;

    const shown = user.display_name || user.global_name || user.username;
    if (shown && ui.name) ui.name.textContent = shown;
    if (user.username && ui.handle) ui.handle.textContent = '@' + user.username;
    paintAvatar(user);

    const status = STATUS[presence.discord_status] ? presence.discord_status : 'offline';
    if (ui.avatar) {
      ui.avatar.classList.remove('is-online', 'is-idle', 'is-dnd', 'is-offline');
      ui.avatar.classList.add('is-' + status);
    }
    if (ui.dot) ui.dot.hidden = false;

    if (ui.live) {
      ui.live.hidden = false;
      ui.live.classList.remove('is-online', 'is-idle', 'is-dnd', 'is-offline');
      ui.live.classList.add('is-' + status);
      const custom = customStatus(presence);
      if (ui.liveState) ui.liveState.textContent = STATUS[status] + (custom ? ' · ' + custom : '');
      const line = status === 'offline' ? '' : activityLine(presence);
      if (ui.liveActivity) {
        ui.liveActivity.hidden = !line;
        ui.liveActivity.textContent = line;
      }
    }

    card.classList.add('is-live');
  }

  async function load() {
    if (document.hidden) return;
    const controller = typeof AbortController === 'function' ? new AbortController() : null;
    const timer = controller ? setTimeout(() => controller.abort(), 7000) : null;
    try {
      const response = await fetch(REST + USER_ID + '?t=' + Date.now(), {
        cache: 'no-store',
        headers: { Accept: 'application/json' },
        signal: controller ? controller.signal : undefined,
      });
      if (!response.ok) return;
      const body = await response.json();
      if (body && body.success && body.data) paint(body.data);
    } catch (error) {
      /* offline or blocked: the written card stays */
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  load();
  setInterval(load, 60000);

  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) load();
  });
})();
