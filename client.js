window.__ModuleLoader__.load({
  id: 'dsh-lsy-feature-pack',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /**
     * 功能增强 (feature pack): two independent features in one plugin.
     *
     * 1. Session deletion — a "Delete session" row in the Session "..." menu
     *    with a confirmation dialog. The Host half serves the two endpoints;
     *    this module only talks to them.
     * 2. Image skin — a picture as the interface background, with opacity,
     *    zoom, horizontal/vertical flips, and a draggable rectangle that picks
     *    which part of the window the picture covers.
     *
     * The two features keep separate namespaces, stores, stylesheets and
     * storage keys; only the plugin identity is shared.
     */
    const PACKAGE = 'dsh-lsy-feature-pack';

    /** Local HTTP surface of this bundle's Host half (session deletion). */
    const API = '/dsh-lsy-feature-pack/api';
    const DELETE_NS = 'featurePackDelete';

    const SKIN_NS = 'featurePackSkin';
    /** Theme override-layer identity; the theme service keeps one layer per source. */
    const SOURCE = PACKAGE;
    // Storage keys keep their historical prefix so an image and settings saved
    // before the merge (by the old skin plugin) still restore.
    const OPACITY_KEY = 'dsh.skin-switcher.image-opacity';
    const FLIP_KEY = 'dsh.skin-switcher.image-flip';
    const VIEW_KEY = 'dsh.skin-switcher.image-view';
    const DEFAULT_OPACITY = 40;
    /** Below `100` the picture no longer fills the window; the base color shows around it. */
    const MIN_ZOOM = 50;
    const MAX_ZOOM = 300;
    const DEFAULT_VIEW = { zoom: 100, panX: 50, panY: 50 };
    /** Below `20` the region would be too small to show anything useful. */
    const MIN_REGION = 20;
    const DEFAULT_REGION = { x: 0, y: 0, w: 100, h: 100 };
    /** The persisted shape, flattened to the store's keys. */
    const DEFAULT_RECORD = {
      zoom: DEFAULT_VIEW.zoom,
      panX: DEFAULT_VIEW.panX,
      panY: DEFAULT_VIEW.panY,
      rx: DEFAULT_REGION.x,
      ry: DEFAULT_REGION.y,
      rw: DEFAULT_REGION.w,
      rh: DEFAULT_REGION.h,
    };
    const MAX_IMAGE_BYTES = 20 * 1024 * 1024;
    // IndexedDB keeps its historical name for the same reason as the keys above.
    const DB_NAME = 'dsh-skin-switcher';
    const DB_STORE = 'assets';
    const DB_KEY = 'background';

    /** Base-surface colors the picture is faded toward, per color scheme. */
    const DEFAULT_BASE = { light: '#ffffff', dark: '#1c1d21' };

    const deleteZh = {
      'menu.delete': '删除会话',
      'dialog.title': '删除会话',
      'dialog.desc': '「{title}」及其全部记录将被永久删除，无法恢复。',
      'dialog.untitled': '未命名会话',
      'dialog.checking': '正在检查关联会话…',
      'dialog.subagents': '将同时删除 {count} 个关联的子智能体会话。',
      'dialog.live': '该会话正在运行，删除会先停止它。',
      'dialog.previewFailed': '无法检查关联子会话，暂时不能删除，请稍后再试。',
      'dialog.unavailable': '删除服务未就绪，请重启 Harness 后再试。',
      'dialog.failed': '删除失败：{message}',
      'dialog.cancel': '取消',
      'dialog.confirm': '删除',
      'dialog.deleting': '删除中…',
    };

    const deleteEn = {
      'menu.delete': 'Delete session',
      'dialog.title': 'Delete session',
      'dialog.desc': '“{title}” and all of its records will be permanently deleted. This cannot be undone.',
      'dialog.untitled': 'Untitled session',
      'dialog.checking': 'Checking related sessions…',
      'dialog.subagents': '{count} related subagent session(s) will be deleted too.',
      'dialog.live': 'This session is running; deletion will stop it first.',
      'dialog.previewFailed': 'Could not check related subagent sessions, so deletion is disabled for now. Try again later.',
      'dialog.unavailable': 'Deletion is not ready yet. Restart Harness and try again.',
      'dialog.failed': 'Delete failed: {message}',
      'dialog.cancel': 'Cancel',
      'dialog.confirm': 'Delete',
      'dialog.deleting': 'Deleting…',
    };

    const skinZh = {
      'image.title': '图片皮肤',
      'image.description': '用本地图片作为界面背景：可调透明度与缩放，并拖动预览里的区域框，决定图片只显示在窗口的哪一块。',
      'image.choose': '选择图片',
      'image.replace': '更换图片',
      'image.remove': '移除',
      'image.none': '无图片',
      'image.opacity': '透明度',
      'image.zoom': '缩放',
      'image.regionHint': '在区域框内拖动可平移画面，拖框的边缘或四角可调整区域大小。',
      'image.edgeLeft': '左偏移',
      'image.edgeRight': '右偏移',
      'image.edgeTop': '上偏移',
      'image.edgeBottom': '下偏移',
      'image.reset': '复位',
      'image.preview': '图片预览',
      'image.flipH': '左右翻转',
      'image.flipV': '上下翻转',
      'image.errorType': '请选择图片文件（PNG、JPG、WebP 等）。',
      'image.errorTooLarge': '图片太大，请选择 20 MB 以内的图片。',
      'image.errorStore': '图片无法保存，本次会话内仍会生效。',
    };

    const skinEn = {
      'image.title': 'Image skin',
      'image.description': 'Uses a local picture as the interface background, with adjustable transparency and zoom; drag the area frame in the preview to choose which part of the window shows it.',
      'image.choose': 'Choose image',
      'image.replace': 'Replace image',
      'image.remove': 'Remove',
      'image.none': 'No image',
      'image.opacity': 'Transparency',
      'image.zoom': 'Zoom',
      'image.regionHint': 'Drag inside the frame to pan; drag its edges or corners to resize it.',
      'image.edgeLeft': 'Left inset',
      'image.edgeRight': 'Right inset',
      'image.edgeTop': 'Top inset',
      'image.edgeBottom': 'Bottom inset',
      'image.reset': 'Reset',
      'image.preview': 'Image preview',
      'image.flipH': 'Flip horizontally',
      'image.flipV': 'Flip vertically',
      'image.errorType': 'Choose an image file (PNG, JPG, WebP, and similar).',
      'image.errorTooLarge': 'That image is too large. Choose one under 20 MB.',
      'image.errorStore': 'The image could not be saved. It stays active for this session.',
    };

    const CSS = [
      // Session deletion
      '.dshDel_item{display:flex;align-items:center;gap:6px;box-sizing:border-box;width:100%;min-height:34px;padding:6px 8px;border:none;border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:13px;line-height:20px;text-align:left;cursor:pointer}',
      '.dshDel_item:hover{background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshDel_icon{display:inline-flex;flex:none;align-items:center;justify-content:center;width:14px;height:14px;color:var(--dsw-alias-menu-icon)}',
      '.dshDel_icon svg{width:14px;height:14px}',
      '.dshDel_label{flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}',
      '.dshDel_overlay{position:fixed;inset:0;z-index:1200;display:flex;align-items:center;justify-content:center;padding:24px;pointer-events:auto}',
      '.dshDel_mask{position:absolute;inset:0;background:var(--dsw-alias-bg-mask-1);backdrop-filter:var(--dsw-mask-blur)}',
      '.dshDel_panel{position:relative;box-sizing:border-box;display:flex;flex-direction:column;gap:10px;width:min(440px,100%);max-height:calc(100vh - 48px);overflow:auto;padding:20px;border-radius:var(--dsw-radius-panel);background:var(--dsw-alias-bg-layer-2);box-shadow:var(--dsw-elevation-prominent);color:var(--dsw-alias-label-primary)}',
      '.dshDel_title{font-size:16px;font-weight:500;line-height:24px}',
      '.dshDel_desc{font-size:14px;line-height:22px;color:var(--dsw-alias-label-secondary);overflow-wrap:anywhere}',
      '.dshDel_note{font-size:12px;line-height:18px;color:var(--dsw-alias-label-tertiary)}',
      '.dshDel_warn{font-size:13px;line-height:20px;color:var(--dsw-alias-state-warn-primary);overflow-wrap:anywhere}',
      '.dshDel_error{font-size:13px;line-height:20px;color:var(--dsw-alias-state-error-primary);overflow-wrap:anywhere}',
      '.dshDel_footer{display:flex;justify-content:flex-end;gap:8px;margin-top:6px}',
      '.dshDel_btn{box-sizing:border-box;height:32px;padding:0 14px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:14px;line-height:20px;cursor:pointer}',
      '.dshDel_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshDel_btn:disabled{opacity:.5;cursor:default}',
      '.dshDel_danger{background:var(--dsw-alias-state-error-primary);border-color:transparent;color:#fff}',
      '.dshDel_danger:hover:not(:disabled){background:var(--dsw-alias-state-error-primary);filter:brightness(1.08)}',
      // Image skin
      '.dshSkin_group{display:flex;flex-direction:column;gap:8px;padding:16px 0;border-bottom:.5px solid var(--dsw-alias-border-l2)}',
      '.dshSkin_title{color:var(--dsw-alias-label-primary);font-size:14px;font-weight:400;line-height:22px}',
      '.dshSkin_desc{color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.dshSkin_imageRow{display:flex;flex-wrap:wrap;align-items:center;gap:8px}',
      '.dshSkin_preview{position:relative;flex:none;box-sizing:border-box;border-radius:8px;overflow:hidden;background-color:var(--dsw-alias-bg-layer-1);box-shadow:0 0 0 1px var(--dsw-alias-border-l1)}',
      '.dshSkin_previewEmpty{display:flex;align-items:center;justify-content:center;border:1px dashed var(--dsw-alias-border-l2);box-shadow:none;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:16px}',
      '.dshSkin_region{position:absolute;overflow:hidden;background-repeat:no-repeat;touch-action:none;cursor:grab}',
      '.dshSkin_regionDragging{cursor:grabbing}',
      '.dshSkin_regionLocked{cursor:default}',
      '.dshSkin_regionOutline{position:absolute;inset:0;box-sizing:border-box;border:1px dashed var(--dsw-alias-label-secondary);border-radius:3px;opacity:.55;pointer-events:none}',
      '.dshSkin_edge{position:absolute;box-sizing:border-box;background:transparent}',
      '.dshSkin_edgeN,.dshSkin_edgeS{left:6px;right:6px;height:10px;cursor:ns-resize}',
      '.dshSkin_edgeN{top:-4px}',
      '.dshSkin_edgeS{bottom:-4px}',
      '.dshSkin_edgeW,.dshSkin_edgeE{top:6px;bottom:6px;width:10px;cursor:ew-resize}',
      '.dshSkin_edgeW{left:-4px}',
      '.dshSkin_edgeE{right:-4px}',
      '.dshSkin_edgeNW,.dshSkin_edgeNE,.dshSkin_edgeSW,.dshSkin_edgeSE{width:12px;height:12px}',
      '.dshSkin_edgeNW{left:-4px;top:-4px;cursor:nwse-resize}',
      '.dshSkin_edgeNE{right:-4px;top:-4px;cursor:nesw-resize}',
      '.dshSkin_edgeSW{left:-4px;bottom:-4px;cursor:nesw-resize}',
      '.dshSkin_edgeSE{right:-4px;bottom:-4px;cursor:nwse-resize}',
      '.dshSkin_hint{color:var(--dsw-alias-label-secondary);font-size:11px;line-height:16px}',
      '.dshSkin_btn{box-sizing:border-box;height:28px;padding:0 12px;border:.5px solid var(--dsw-alias-border-l2);border-radius:var(--dsw-radius-md);background:transparent;color:var(--dsw-alias-label-primary);font:inherit;font-size:12px;line-height:18px;cursor:pointer}',
      '.dshSkin_btn:hover:not(:disabled){background:var(--dsw-alias-interactive-bg-hover)}',
      '.dshSkin_btn:disabled{opacity:.5;cursor:default}',
      '.dshSkin_btnActive{background:var(--dsw-alias-bg-module-platform);border-color:var(--dsw-static-neutral-bluish-400)}',
      '.dshSkin_btnSmall{height:22px;padding:0 8px;font-size:11px;line-height:14px}',
      '.dshSkin_file{display:none}',
      '.dshSkin_slider{display:flex;align-items:center;gap:8px;color:var(--dsw-alias-label-secondary);font-size:12px;line-height:18px}',
      '.dshSkin_sliderLabel{flex:none}',
      '.dshSkin_range{flex:1;min-width:120px;max-width:220px;accent-color:var(--dsw-alias-brand-primary);cursor:pointer}',
      '.dshSkin_range:disabled{cursor:default;opacity:.5}',
      '.dshSkin_value{min-width:36px;text-align:right;color:var(--dsw-alias-label-primary);font-variant-numeric:tabular-nums}',
      '.dshSkin_error{color:var(--dsw-alias-state-error-primary);font-size:12px;line-height:18px}',
    ].join('');

    // ---------------------------------------------------------------- session delete

    /** Pending deletion request shared by the menu row and the overlay dialog. */
    const deleteStore = {
      request: null,
      listeners: new Set(),
      get() {
        return deleteStore.request;
      },
      subscribe(listener) {
        deleteStore.listeners.add(listener);
        return () => {
          deleteStore.listeners.delete(listener);
        };
      },
      set(request) {
        deleteStore.request = request;
        for (const listener of [...deleteStore.listeners]) listener();
      },
    };

    function useRequest() {
      const [value, setValue] = React.useState(deleteStore.get);
      React.useEffect(() => {
        const off = deleteStore.subscribe(() => setValue(deleteStore.get()));
        setValue(deleteStore.get());
        return off;
      }, []);
      return value;
    }

    function TrashIcon() {
      return h(
        'svg',
        {
          viewBox: '0 0 16 16',
          width: 14,
          height: 14,
          fill: 'none',
          stroke: 'currentColor',
          strokeWidth: 1.4,
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          'aria-hidden': 'true',
        },
        h('path', { d: 'M2.5 4.5h11' }),
        h('path', { d: 'M6.5 4.5V3a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1.5' }),
        h('path', { d: 'M4 4.5l.7 8.6a1 1 0 0 0 1 .9h4.6a1 1 0 0 0 1-.9l.7-8.6' }),
        h('path', { d: 'M6.8 7v4.4M9.2 7v4.4' }),
      );
    }

    async function callApi(path, options = {}) {
      const response = await fetch(API + path, options);
      const text = await response.text();
      let body = null;
      try {
        body = text.trim() === '' ? null : JSON.parse(text);
      } catch {
        body = null;
      }
      return { status: response.status, body };
    }

    /** One row in the Session "..." menu; opening it raises the confirm dialog. */
    function DeleteMenuItem({ sessionId, displayTitle, useMenuOpenState, useSessionStatus, t, requestDelete }) {
      const [, setMenuOpen] = useMenuOpenState();
      const status = useSessionStatus((statuses) => statuses.get(sessionId));
      return h(
        'button',
        {
          type: 'button',
          role: 'menuitem',
          className: 'dshDel_item',
          onClick: () => {
            setMenuOpen(false);
            requestDelete(sessionId, displayTitle, status?.running === true);
          },
        },
        h('span', { className: 'dshDel_icon' }, h(TrashIcon)),
        h('span', { className: 'dshDel_label' }, t('menu.delete')),
      );
    }

    /** shell.overlay entry: nothing while no deletion is pending. */
    function DeleteDialog({ t }) {
      const request = useRequest();
      if (request === null) return null;
      return h(DeleteForm, { key: request.sessionId, request, t });
    }

    function DeleteForm({ request, t }) {
      const [preview, setPreview] = React.useState({
        loading: true,
        failed: false,
        unavailable: false,
        subagentCount: 0,
      });
      const [busy, setBusy] = React.useState(false);
      const [error, setError] = React.useState(null);
      const cancelButton = React.useRef(null);

      React.useEffect(() => {
        const timer = window.setTimeout(() => cancelButton.current?.focus(), 0);
        return () => window.clearTimeout(timer);
      }, []);

      React.useEffect(() => {
        const controller = new AbortController();
        let mounted = true;
        callApi(`/preview?sessionId=${encodeURIComponent(request.sessionId)}`, {
          signal: controller.signal,
        })
          .then((response) => {
            if (!mounted) return;
            if (response.body?.ok && typeof response.body.result?.subagentCount === 'number') {
              setPreview({
                loading: false,
                failed: false,
                unavailable: false,
                subagentCount: response.body.result.subagentCount,
              });
            } else if (response.body === null) {
              setPreview({
                loading: false,
                failed: false,
                unavailable: true,
                subagentCount: 0,
              });
            } else {
              setPreview({
                loading: false,
                failed: true,
                unavailable: false,
                subagentCount: 0,
              });
            }
          })
          .catch((failure) => {
            if (!mounted || failure?.name === 'AbortError') return;
            setPreview({
              loading: false,
              failed: true,
              unavailable: false,
              subagentCount: 0,
            });
          });
        return () => {
          mounted = false;
          controller.abort();
        };
      }, [request.sessionId]);

      React.useEffect(() => {
        const onKeyDown = (event) => {
          if (event.key === 'Escape' && !busy) deleteStore.set(null);
        };
        document.addEventListener('keydown', onKeyDown, true);
        return () => document.removeEventListener('keydown', onKeyDown, true);
      }, [busy]);

      const close = () => {
        if (!busy) deleteStore.set(null);
      };

      const blocked = preview.loading || preview.failed || preview.unavailable;

      const confirm = async () => {
        if (busy || blocked) return;
        setBusy(true);
        setError(null);
        try {
          const response = await callApi('/delete', {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ sessionId: request.sessionId }),
          });
          if (response.body?.ok) {
            deleteStore.set(null);
            return;
          }
          if (response.body === null) {
            setError(t('dialog.unavailable'));
          } else {
            const message =
              typeof response.body.error === 'string' && response.body.error !== ''
                ? response.body.error
                : `HTTP ${response.status}`;
            setError(t('dialog.failed', { message }));
          }
        } catch (failure) {
          const message = failure instanceof Error ? failure.message : String(failure);
          setError(t('dialog.failed', { message }));
        } finally {
          setBusy(false);
        }
      };

      return h(
        'div',
        { className: 'dshDel_overlay' },
        h('div', { className: 'dshDel_mask', 'aria-hidden': 'true', onClick: close }),
        h(
          'div',
          {
            className: 'dshDel_panel',
            role: 'dialog',
            'aria-modal': 'true',
            'aria-labelledby': 'dsh-del-title',
          },
          h('div', { className: 'dshDel_title', id: 'dsh-del-title' }, t('dialog.title')),
          h(
            'div',
            { className: 'dshDel_desc' },
            t('dialog.desc', { title: request.title || t('dialog.untitled') }),
          ),
          preview.loading ? h('div', { className: 'dshDel_note' }, t('dialog.checking')) : null,
          preview.failed ? h('div', { className: 'dshDel_warn' }, t('dialog.previewFailed')) : null,
          preview.unavailable ? h('div', { className: 'dshDel_warn' }, t('dialog.unavailable')) : null,
          request.running ? h('div', { className: 'dshDel_warn' }, t('dialog.live')) : null,
          preview.subagentCount > 0
            ? h('div', { className: 'dshDel_warn' }, t('dialog.subagents', { count: preview.subagentCount }))
            : null,
          error === null ? null : h('div', { className: 'dshDel_error', role: 'alert' }, error),
          h(
            'div',
            { className: 'dshDel_footer' },
            h(
              'button',
              {
                ref: cancelButton,
                type: 'button',
                className: 'dshDel_btn',
                onClick: close,
                disabled: busy,
              },
              t('dialog.cancel'),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'dshDel_btn dshDel_danger',
                onClick: confirm,
                disabled: busy || blocked,
              },
              busy ? t('dialog.deleting') : t('dialog.confirm'),
            ),
          ),
        ),
      );
    }

    /** Bound in `apply`; the menu row calls it through its inject face. */
    const deleteActions = {
      requestDelete() {},
    };

    // ---------------------------------------------------------------- image skin

    /** The single state owner: the settings row reads it, the actions write it. */
    const store = {
      state: {
        imageUrl: null,
        imageSize: null,
        opacity: DEFAULT_OPACITY,
        errorKey: null,
        veil: null,
        scheme: 'light',
        flipH: false,
        flipV: false,
        zoom: DEFAULT_VIEW.zoom,
        panX: DEFAULT_VIEW.panX,
        panY: DEFAULT_VIEW.panY,
        rx: DEFAULT_REGION.x,
        ry: DEFAULT_REGION.y,
        rw: DEFAULT_REGION.w,
        rh: DEFAULT_REGION.h,
        busy: false,
      },
      listeners: new Set(),
      get() {
        return store.state;
      },
      subscribe(listener) {
        store.listeners.add(listener);
        return () => {
          store.listeners.delete(listener);
        };
      },
      patch(patch) {
        store.state = { ...store.state, ...patch };
        for (const listener of [...store.listeners]) listener();
      },
    };

    const actions = {
      uploadImage() {},
      removeImage() {},
      setOpacity() {},
      toggleFlip() {},
      setZoom() {},
      setView() {},
      setRegionRect() {},
      resetView() {},
      persistView() {},
    };

    function rgba(hex, alpha) {
      const raw = hex.replace('#', '');
      const r = Number.parseInt(raw.slice(0, 2), 16);
      const g = Number.parseInt(raw.slice(2, 4), 16);
      const b = Number.parseInt(raw.slice(4, 6), 16);
      return `rgba(${r}, ${g}, ${b}, ${Math.round(alpha * 1000) / 1000})`;
    }

    function clampPercent(value) {
      return Number.isFinite(value) ? Math.min(100, Math.max(0, Math.round(value * 10) / 10)) : 50;
    }

    function clampZoom(value) {
      return Number.isFinite(value)
        ? Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, Math.round(value / 5) * 5))
        : DEFAULT_VIEW.zoom;
    }

    function readOpacity() {
      try {
        const parsed = Number.parseInt(window.localStorage.getItem(OPACITY_KEY) ?? '', 10);
        return Number.isFinite(parsed) ? Math.min(100, Math.max(0, parsed)) : DEFAULT_OPACITY;
      } catch {
        return DEFAULT_OPACITY;
      }
    }

    function persistOpacity(value) {
      try {
        window.localStorage.setItem(OPACITY_KEY, String(value));
      } catch {
        /* The value still applies for this page. */
      }
    }

    function readFlips() {
      try {
        const stored = window.localStorage.getItem(FLIP_KEY) ?? '';
        return { h: stored.includes('h'), v: stored.includes('v') };
      } catch {
        return { h: false, v: false };
      }
    }

    function persistFlips(flipH, flipV) {
      try {
        window.localStorage.setItem(FLIP_KEY, `${flipH ? 'h' : ''}${flipV ? 'v' : ''}`);
      } catch {
        /* The flags still apply for this page. */
      }
    }

    /** Keep the rectangle inside the window and above the minimum size. */
    function clampRegion(rect) {
      const w = Math.min(100, Math.max(MIN_REGION, Number.isFinite(rect.w) ? rect.w : 100));
      const h = Math.min(100, Math.max(MIN_REGION, Number.isFinite(rect.h) ? rect.h : 100));
      const x = Math.min(100 - w, Math.max(0, Number.isFinite(rect.x) ? rect.x : 0));
      const y = Math.min(100 - h, Math.max(0, Number.isFinite(rect.y) ? rect.y : 0));
      return { x, y, w, h };
    }

    /**
     * Resize the rectangle from one edge (or a corner) while the opposite
     * edge stays where it is. Distances are in window percentages.
     */
    function resizeRegion(rect, handle, dx, dy) {
      let { x, y, w, h } = rect;
      const right = x + w;
      const bottom = y + h;
      if (handle.includes('w')) {
        const nextX = Math.min(right - MIN_REGION, Math.max(0, x + dx));
        w = right - nextX;
        x = nextX;
      }
      if (handle.includes('e')) {
        w = Math.min(100 - x, Math.max(MIN_REGION, right + dx - x));
      }
      if (handle.includes('n')) {
        const nextY = Math.min(bottom - MIN_REGION, Math.max(0, y + dy));
        h = bottom - nextY;
        y = nextY;
      }
      if (handle.includes('s')) {
        h = Math.min(100 - y, Math.max(MIN_REGION, bottom + dy - y));
      }
      return clampRegion({ x, y, w, h });
    }

    /**
     * Zoom, the pan offset that picks the visible slice, and the rectangle the
     * picture is painted into. Older records stored only `x`/`y` for the pan.
     */
    function readView() {
      try {
        const parsed = JSON.parse(window.localStorage.getItem(VIEW_KEY) ?? 'null');
        if (parsed === null || typeof parsed !== 'object') return { ...DEFAULT_RECORD };
        const rect = clampRegion({
          x: Number(parsed.rx),
          y: Number(parsed.ry),
          w: Number(parsed.rw),
          h: Number(parsed.rh),
        });
        return {
          zoom: clampZoom(Number(parsed.zoom)),
          panX: clampPercent(Number(parsed.panX ?? parsed.x)),
          panY: clampPercent(Number(parsed.panY ?? parsed.y)),
          rx: rect.x,
          ry: rect.y,
          rw: rect.w,
          rh: rect.h,
        };
      } catch {
        return { ...DEFAULT_RECORD };
      }
    }

    function persistView(view) {
      try {
        window.localStorage.setItem(VIEW_KEY, JSON.stringify(view));
      } catch {
        /* The view still applies for this page. */
      }
    }

    function openDatabase() {
      return new Promise((resolve, reject) => {
        if (typeof indexedDB === 'undefined') {
          reject(new Error('indexedDB is unavailable'));
          return;
        }
        const request = indexedDB.open(DB_NAME, 1);
        request.onupgradeneeded = () => {
          if (!request.result.objectStoreNames.contains(DB_STORE)) {
            request.result.createObjectStore(DB_STORE);
          }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    }

    async function readStoredImage() {
      const db = await openDatabase();
      try {
        return await new Promise((resolve, reject) => {
          const transaction = db.transaction(DB_STORE, 'readonly');
          const request = transaction.objectStore(DB_STORE).get(DB_KEY);
          request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
          request.onerror = () => reject(request.error);
        });
      } finally {
        db.close();
      }
    }

    async function saveStoredImage(blob) {
      const db = await openDatabase();
      try {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(DB_STORE, 'readwrite');
          transaction.objectStore(DB_STORE).put(blob, DB_KEY);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        db.close();
      }
    }

    async function deleteStoredImage() {
      const db = await openDatabase();
      try {
        await new Promise((resolve, reject) => {
          const transaction = db.transaction(DB_STORE, 'readwrite');
          transaction.objectStore(DB_STORE).delete(DB_KEY);
          transaction.oncomplete = () => resolve();
          transaction.onerror = () => reject(transaction.error);
          transaction.onabort = () => reject(transaction.error);
        });
      } finally {
        db.close();
      }
    }

    /** Natural pixel size, so the picture can cover the viewport exactly. */
    function measureImage(blob) {
      return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(blob);
        const image = new window.Image();
        image.onload = () => {
          const size = { w: image.naturalWidth, h: image.naturalHeight };
          URL.revokeObjectURL(url);
          if (size.w > 0 && size.h > 0) resolve(size);
          else reject(new Error('empty image'));
        };
        image.onerror = () => {
          URL.revokeObjectURL(url);
          reject(new Error('unreadable image'));
        };
        image.src = url;
      });
    }

    /**
     * Turn the stored picture into the displayed URL. A flip is baked into the
     * bitmap (canvas), because a CSS background cannot be mirrored on its own
     * without flipping the whole document.
     */
    async function renderDisplayUrl(blob, flipH, flipV) {
      if (!flipH && !flipV) return URL.createObjectURL(blob);
      let bitmap;
      try {
        bitmap = await createImageBitmap(blob);
      } catch {
        return URL.createObjectURL(blob);
      }
      try {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (context === null) return URL.createObjectURL(blob);
        context.translate(flipH ? canvas.width : 0, flipV ? canvas.height : 0);
        context.scale(flipH ? -1 : 1, flipV ? -1 : 1);
        context.drawImage(bitmap, 0, 0);
        const flipped = await new Promise((resolve) => {
          canvas.toBlob(resolve, 'image/png');
        });
        return flipped === null ? URL.createObjectURL(blob) : URL.createObjectURL(flipped);
      } finally {
        bitmap.close?.();
      }
    }

    function useStoreState() {
      const [value, setValue] = React.useState(store.get);
      React.useEffect(() => {
        const off = store.subscribe(() => setValue(store.get()));
        setValue(store.get());
        return off;
      }, []);
      return value;
    }

    function useViewport() {
      const [viewport, setViewport] = React.useState(() => ({
        w: Math.max(1, window.innerWidth),
        h: Math.max(1, window.innerHeight),
      }));
      React.useEffect(() => {
        const onResize = () => {
          setViewport({ w: Math.max(1, window.innerWidth), h: Math.max(1, window.innerHeight) });
        };
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, []);
      return viewport;
    }

    /**
     * The General-settings Image skin row: local picture, flips, zoom, and the
     * rectangle of the window the picture is painted into.
     */
    function ImageRow({ t }) {
      const {
        imageUrl,
        imageSize,
        opacity,
        errorKey,
        veil,
        scheme,
        flipH,
        flipV,
        zoom,
        panX,
        panY,
        rx,
        ry,
        rw,
        rh,
        busy,
      } = useStoreState();
      const viewport = useViewport();
      const fileInput = React.useRef(null);
      const drag = React.useRef(null);
      const [dragging, setDragging] = React.useState(false);
      const hasImage = imageUrl !== null;
      const panReady = hasImage && imageSize !== null && !busy;
      const ratio = viewport.h / viewport.w;
      const base = DEFAULT_BASE[scheme] ?? DEFAULT_BASE.light;
      const region = clampRegion({ x: rx, y: ry, w: rw, h: rh });
      const frameWidth = Math.round(Math.min(300, Math.max(150, 164 / ratio)));
      // Integer width and height keep the preview's edge on whole pixels.
      const frameHeight = Math.round(frameWidth * (viewport.h / viewport.w));
      // Whole-frame bounds in the preview's pixels, so the drag handlers translate
      // pointer movement straight into window percentages.
      const totalW = frameWidth;
      const totalH = frameHeight;
      const regionX = (region.x * totalW) / 100;
      const regionY = (region.y * totalH) / 100;
      const regionW = (region.w * totalW) / 100;
      const regionH = (region.h * totalH) / 100;
      // The picture covers the region, so its scale comes from the region's own
      // size, not the window's; the +1px margin hides sub-pixel rounding.
      const scale =
        imageSize === null
          ? 1
          : Math.max(regionW / imageSize.w, regionH / imageSize.h) * (zoom / 100);
      const imageW = Math.ceil((imageSize === null ? regionW : imageSize.w) * scale) + 1;
      const imageH = Math.ceil((imageSize === null ? regionH : imageSize.h) * scale) + 1;
      const stageStyle = {
        width: `${frameWidth}px`,
        height: `${frameHeight}px`,
        backgroundColor: hasImage ? base : undefined,
      };
      const regionStyle = {
        left: `${regionX}px`,
        top: `${regionY}px`,
        width: `${regionW}px`,
        height: `${regionH}px`,
        backgroundColor: base,
        backgroundImage: `linear-gradient(${veil ?? 'transparent'},${veil ?? 'transparent'}),url("${imageUrl}")`,
        backgroundSize: `100% 100%,${imageW}px ${imageH}px`,
        backgroundPosition: `0 0,${panX}% ${panY}%`,
      };

      const onPointerDown = (event) => {
        if (!panReady || event.button !== 0) return;
        event.preventDefault();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag.current = { x: event.clientX, y: event.clientY, px: panX, py: panY };
        setDragging(true);
      };

      const onPointerMove = (event) => {
        const start = drag.current;
        if (start === null || imageSize === null) return;
        const box = event.currentTarget.getBoundingClientRect();
        if (box.width < 1 || box.height < 1) return;
        const s = Math.max(box.width / imageSize.w, box.height / imageSize.h) * (zoom / 100);
        const paintedW = imageSize.w * s;
        const paintedH = imageSize.h * s;
        const overflowX = Math.max(0, paintedW - box.width);
        const overflowY = Math.max(0, paintedH - box.height);
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        actions.setView(
          overflowX > 0 ? start.px - (dx / overflowX) * 100 : panX,
          overflowY > 0 ? start.py - (dy / overflowY) * 100 : panY,
          false,
        );
      };

      const endDrag = (event) => {
        if (drag.current === null) return;
        drag.current = null;
        setDragging(false);
        try {
          event.currentTarget.releasePointerCapture?.(event.pointerId);
        } catch {
          /* The capture is already gone (pointer cancel). */
        }
        actions.persistView();
      };

      const onHandleDown = (handle) => (event) => {
        if (!panReady || event.button !== 0) return;
        event.preventDefault();
        event.stopPropagation();
        event.currentTarget.setPointerCapture?.(event.pointerId);
        drag.current = {
          x: event.clientX,
          y: event.clientY,
          rect: { ...region },
          handle,
        };
        setDragging(true);
      };

      const onHandleMove = (event) => {
        const start = drag.current;
        if (start === null || start.rect === undefined) return;
        const dx = ((event.clientX - start.x) / totalW) * 100;
        const dy = ((event.clientY - start.y) / totalH) * 100;
        actions.setRegionRect(resizeRegion(start.rect, start.handle, dx, dy), false);
      };

      /**
       * The edge sliders read as the gap from that window edge to the region:
       * raising one pushes the nearest edge of the frame inward while the
       * opposite edge stays put.
       */
      const xStart = Math.round(region.x);
      const xEnd = 100 - Math.round(region.x + region.w);
      const yStart = Math.round(region.y);
      const yEnd = 100 - Math.round(region.y + region.h);
      // The edge sliders only ever change one side, so they all go through the
      // same whole-rectangle setter.
      const setLeft = (inset) =>
        actions.setRegionRect(clampRegion({ ...region, x: inset, w: 100 - inset }));
      const setRight = (inset) => {
        const right = 100 - inset;
        const x = Math.min(right - MIN_REGION, region.x);
        actions.setRegionRect(clampRegion({ ...region, x, w: right - x }));
      };
      const setTop = (inset) =>
        actions.setRegionRect(clampRegion({ ...region, y: inset, h: 100 - inset }));
      const setBottom = (inset) => {
        const bottom = 100 - inset;
        const y = Math.min(bottom - MIN_REGION, region.y);
        actions.setRegionRect(clampRegion({ ...region, y, h: bottom - y }));
      };
      return h(
        'div',
        { className: 'dshSkin_group' },
        h('div', { className: 'dshSkin_title' }, t('image.title')),
        h('div', { className: 'dshSkin_desc' }, t('image.description')),
        h(
          'div',
          {
            className: hasImage ? 'dshSkin_preview' : 'dshSkin_preview dshSkin_previewEmpty',
            style: stageStyle,
            role: hasImage ? 'img' : undefined,
            'aria-label': hasImage ? t('image.preview') : undefined,
          },
          hasImage
            ? h(
                'div',
                {
                  className: [
                    'dshSkin_region',
                    panReady ? '' : 'dshSkin_regionLocked',
                    dragging ? 'dshSkin_regionDragging' : '',
                  ]
                    .filter(Boolean)
                    .join(' '),
                  style: regionStyle,
                  onPointerDown,
                  onPointerMove,
                  onPointerUp: endDrag,
                  onPointerCancel: endDrag,
                  onLostPointerCapture: endDrag,
                },
                h('div', { className: 'dshSkin_regionOutline', 'aria-hidden': 'true' }),
                ['n', 's', 'w', 'e', 'nw', 'ne', 'sw', 'se'].map((handle) =>
                  h('div', {
                    key: handle,
                    className: `dshSkin_edge dshSkin_edge${handle.toUpperCase()}`,
                    'aria-hidden': 'true',
                    onPointerDown: onHandleDown(handle),
                    onPointerMove: onHandleMove,
                    onPointerUp: endDrag,
                    onPointerCancel: endDrag,
                    onLostPointerCapture: endDrag,
                  }),
                ),
              )
            : t('image.none'),
        ),
        hasImage ? h('div', { className: 'dshSkin_hint' }, t('image.regionHint')) : null,
        h(
          'div',
          { className: 'dshSkin_slider' },
          h(
            'label',
            { className: 'dshSkin_sliderLabel', htmlFor: 'dsh-skin-edge-left' },
            t('image.edgeLeft'),
          ),
          h('input', {
            id: 'dsh-skin-edge-left',
            type: 'range',
            min: 0,
            max: 100 - MIN_REGION,
            step: 1,
            value: Math.min(xStart, 100 - MIN_REGION),
            disabled: !hasImage,
            className: 'dshSkin_range',
            'aria-label': t('image.edgeLeft'),
            onChange: (event) => {
              setLeft(Number(event.target.value));
            },
          }),
          h('span', { className: 'dshSkin_value' }, `${xStart}%`),
          h('input', {
            id: 'dsh-skin-edge-right',
            type: 'range',
            min: 0,
            max: 100 - MIN_REGION,
            step: 1,
            value: Math.min(xEnd, 100 - MIN_REGION),
            disabled: !hasImage,
            className: 'dshSkin_range',
            'aria-label': t('image.edgeRight'),
            onChange: (event) => {
              setRight(Number(event.target.value));
            },
          }),
        ),
        h(
          'div',
          { className: 'dshSkin_slider' },
          h(
            'label',
            { className: 'dshSkin_sliderLabel', htmlFor: 'dsh-skin-edge-top' },
            t('image.edgeTop'),
          ),
          h('input', {
            id: 'dsh-skin-edge-top',
            type: 'range',
            min: 0,
            max: 100 - MIN_REGION,
            step: 1,
            value: Math.min(yStart, 100 - MIN_REGION),
            disabled: !hasImage,
            className: 'dshSkin_range',
            'aria-label': t('image.edgeTop'),
            onChange: (event) => {
              setTop(Number(event.target.value));
            },
          }),
          h('span', { className: 'dshSkin_value' }, `${yStart}%`),
          h('input', {
            id: 'dsh-skin-edge-bottom',
            type: 'range',
            min: 0,
            max: 100 - MIN_REGION,
            step: 1,
            value: Math.min(yEnd, 100 - MIN_REGION),
            disabled: !hasImage,
            className: 'dshSkin_range',
            'aria-label': t('image.edgeBottom'),
            onChange: (event) => {
              setBottom(Number(event.target.value));
            },
          }),
        ),
        h(
          'div',
          { className: 'dshSkin_imageRow' },
          h(
            'button',
            {
              type: 'button',
              className: 'dshSkin_btn',
              onClick: () => {
                fileInput.current?.click();
              },
            },
            hasImage ? t('image.replace') : t('image.choose'),
          ),
          hasImage
            ? h(
                'button',
                {
                  type: 'button',
                  className: 'dshSkin_btn',
                  onClick: () => {
                    actions.removeImage();
                  },
                },
                t('image.remove'),
              )
            : null,
          h(
            'button',
            {
              type: 'button',
              className: flipH ? 'dshSkin_btn dshSkin_btnActive' : 'dshSkin_btn',
              'aria-pressed': flipH,
              disabled: !hasImage || busy,
              onClick: () => {
                actions.toggleFlip('h');
              },
            },
            t('image.flipH'),
          ),
          h(
            'button',
            {
              type: 'button',
              className: flipV ? 'dshSkin_btn dshSkin_btnActive' : 'dshSkin_btn',
              'aria-pressed': flipV,
              disabled: !hasImage || busy,
              onClick: () => {
                actions.toggleFlip('v');
              },
            },
            t('image.flipV'),
          ),
          h('input', {
            ref: fileInput,
            type: 'file',
            accept: 'image/*',
            className: 'dshSkin_file',
            onChange: (event) => {
              const file = event.target.files?.[0];
              event.target.value = '';
              if (file) actions.uploadImage(file);
            },
          }),
        ),
        h(
          'div',
          { className: 'dshSkin_slider' },
          h(
            'label',
            { className: 'dshSkin_sliderLabel', htmlFor: 'dsh-skin-image-zoom' },
            t('image.zoom'),
          ),
          h('input', {
            id: 'dsh-skin-image-zoom',
            type: 'range',
            min: MIN_ZOOM,
            max: MAX_ZOOM,
            step: 10,
            value: zoom,
            disabled: !hasImage,
            className: 'dshSkin_range',
            'aria-label': t('image.zoom'),
            onChange: (event) => {
              actions.setZoom(Number(event.target.value));
            },
          }),
          h('span', { className: 'dshSkin_value' }, `${zoom}%`),
          h(
            'button',
            {
              type: 'button',
              className: 'dshSkin_btn dshSkin_btnSmall',
              disabled: !hasImage,
              onClick: () => {
                actions.resetView();
              },
            },
            t('image.reset'),
          ),
        ),
        h(
          'div',
          { className: 'dshSkin_slider' },
          h(
            'label',
            { className: 'dshSkin_sliderLabel', htmlFor: 'dsh-skin-image-opacity' },
            t('image.opacity'),
          ),
          h('input', {
            id: 'dsh-skin-image-opacity',
            type: 'range',
            min: 0,
            max: 100,
            step: 5,
            value: opacity,
            disabled: !hasImage,
            className: 'dshSkin_range',
            'aria-label': t('image.opacity'),
            onChange: (event) => {
              actions.setOpacity(Number(event.target.value));
            },
          }),
          h('span', { className: 'dshSkin_value' }, `${opacity}%`),
        ),
        errorKey === null
          ? null
          : h('div', { className: 'dshSkin_error', role: 'alert' }, t(`image.${errorKey}`)),
      );
    }

    // ---------------------------------------------------------------- plugin

    function apply(ctx) {
      const styleTag = document.createElement('style');
      styleTag.dataset.plugin = SOURCE;
      styleTag.textContent = CSS;
      document.head.appendChild(styleTag);

      const imageTag = document.createElement('style');
      imageTag.dataset.plugin = SOURCE;
      document.head.appendChild(imageTag);

      let sourceBlob = null;
      let objectUrl = null;
      let flipToken = 0;
      let layerDispose;
      let disposed = false;

      /** The picture is painted unless it was removed or set fully transparent. */
      const imageActive = () =>
        store.state.imageUrl !== null && store.state.opacity < 100;

      /** Fade the picture toward the active base color; the setting picks how much. */
      const veilFor = (scheme) => {
        const visibility = 0.55 * (1 - store.state.opacity / 100);
        return rgba(DEFAULT_BASE[scheme], 1 - visibility);
      };

      /**
       * Paint the picture into the chosen rectangle of the window, with the veil
       * of the active base color on top. While a picture is active the shell's
       * background tokens turn transparent, so however many surfaces stack up,
       * none tints the picture a second time.
       *
       * The rectangle is a fixed pseudo-element of the root element: it stays
       * behind every surface without adding a DOM node, its bounds are window
       * percentages that follow a resize, and the picture is sized in pixels to
       * cover exactly that rectangle at 100% zoom.
       */
      const renderImageCss = () => {
        if (!imageActive()) {
          if (imageTag.textContent !== '') imageTag.textContent = '';
          if (store.state.veil !== null) store.patch({ veil: null });
          return;
        }
        const scheme = ctx.theme.getTheme().active.colorScheme === 'dark' ? 'dark' : 'light';
        const veil = veilFor(scheme);
        const base = DEFAULT_BASE[scheme];
        const size = store.state.imageSize;
        const region = clampRegion({
          x: store.state.rx,
          y: store.state.ry,
          w: store.state.rw,
          h: store.state.rh,
        });
        let layer = '';
        if (size !== null && size.w > 0 && size.h > 0) {
          // The fixed layer's percentages resolve against the initial containing
          // block, which is the client box, not `innerWidth` (scrollbar included).
          const root = document.documentElement;
          const vw = Math.max(1, root.clientWidth || window.innerWidth);
          const vh = Math.max(1, root.clientHeight || window.innerHeight);
          const boxW = Math.max(1, (vw * region.w) / 100);
          const boxH = Math.max(1, (vh * region.h) / 100);
          // Pixel sizes: the picture covers the region, plus a one-pixel margin
          // so a sub-pixel rounding never leaves a hairline at an edge.
          const scale = Math.max(boxW / size.w, boxH / size.h) * (store.state.zoom / 100);
          layer = [
            'html::before{',
            "content:''!important;display:block!important;position:fixed!important;",
            `left:${region.x}%!important;top:${region.y}%!important;`,
            `width:${region.w}%!important;height:${region.h}%!important;`,
            `background-color:${base}!important;`,
            `background-image:linear-gradient(${veil},${veil}),url("${store.state.imageUrl}")!important;`,
            `background-size:100% 100%,${Math.ceil(size.w * scale) + 1}px ${Math.ceil(size.h * scale) + 1}px!important;`,
            `background-position:0 0,${store.state.panX}% ${store.state.panY}%!important;`,
            'background-repeat:no-repeat!important;pointer-events:none!important;z-index:-1!important;',
            '}',
          ].join('');
        } else if (store.state.imageUrl !== null) {
          // The picture could not be measured: cover the region and stay put.
          layer = [
            'html::before{',
            "content:''!important;display:block!important;position:fixed!important;",
            `left:${region.x}%!important;top:${region.y}%!important;`,
            `width:${region.w}%!important;height:${region.h}%!important;`,
            `background-color:${base}!important;`,
            `background-image:linear-gradient(${veil},${veil}),url("${store.state.imageUrl}")!important;`,
            'background-size:100% 100%,cover!important;background-position:0 0,center!important;',
            'background-repeat:no-repeat!important;pointer-events:none!important;z-index:-1!important;',
            '}',
          ].join('');
        }
        imageTag.textContent = [
          `html{background-color:${base}!important}`,
          'html body{background-color:transparent!important}',
          layer,
        ].join('');
        if (store.state.veil !== veil || store.state.scheme !== scheme) {
          store.patch({ veil, scheme });
        }
      };

      const mergedTokens = () => {
        if (!imageActive()) return {};
        return {
          '--dsw-alias-bg-base': { light: 'transparent', dark: 'transparent' },
          '--dsw-specific-sidebar-fill': { light: 'transparent', dark: 'transparent' },
        };
      };

      const refresh = () => {
        const tokens = mergedTokens();
        if (Object.keys(tokens).length === 0) {
          layerDispose?.();
          layerDispose = undefined;
        } else {
          layerDispose = ctx.theme.overrideTokens(SOURCE, tokens);
        }
        renderImageCss();
      };

      /** Re-render the stored blob with the current flip flags. */
      const refreshDisplay = async () => {
        if (sourceBlob === null) return;
        const token = ++flipToken;
        store.patch({ busy: true });
        let url;
        try {
          url = await renderDisplayUrl(sourceBlob, store.state.flipH, store.state.flipV);
        } catch {
          url = URL.createObjectURL(sourceBlob);
        }
        let size = store.state.imageSize;
        if (size === null) {
          try {
            size = await measureImage(sourceBlob);
          } catch {
            size = null;
          }
        }
        if (disposed || token !== flipToken) {
          URL.revokeObjectURL(url);
          return;
        }
        if (objectUrl !== null) URL.revokeObjectURL(objectUrl);
        objectUrl = url;
        store.patch({ imageUrl: url, imageSize: size, errorKey: null, busy: false });
        refresh();
      };

      actions.uploadImage = async (file) => {
        if (typeof file?.type !== 'string' || !file.type.startsWith('image/')) {
          store.patch({ errorKey: 'errorType' });
          return;
        }
        if (file.size > MAX_IMAGE_BYTES) {
          store.patch({ errorKey: 'errorTooLarge' });
          return;
        }
        let stored = true;
        try {
          await saveStoredImage(file);
        } catch {
          stored = false;
        }
        if (disposed) return;
        sourceBlob = file;
        await refreshDisplay();
        store.patch({ errorKey: stored ? null : 'errorStore' });
      };

      actions.removeImage = async () => {
        flipToken += 1;
        if (objectUrl !== null) {
          URL.revokeObjectURL(objectUrl);
          objectUrl = null;
        }
        sourceBlob = null;
        store.patch({
          imageUrl: null,
          imageSize: null,
          errorKey: null,
          flipH: false,
          flipV: false,
          zoom: DEFAULT_VIEW.zoom,
          panX: DEFAULT_VIEW.panX,
          panY: DEFAULT_VIEW.panY,
          rx: DEFAULT_REGION.x,
          ry: DEFAULT_REGION.y,
          rw: DEFAULT_REGION.w,
          rh: DEFAULT_REGION.h,
          busy: false,
        });
        persistFlips(false, false);
        persistView(currentView());
        refresh();
        try {
          await deleteStoredImage();
        } catch {
          /* Nothing durable to remove. */
        }
      };

      actions.setOpacity = (value) => {
        const next = Math.max(0, Math.min(100, Math.round(value / 5) * 5));
        if (next === store.state.opacity) return;
        persistOpacity(next);
        store.patch({ opacity: next });
        refresh();
      };

      actions.toggleFlip = (axis) => {
        if (sourceBlob === null) return;
        const flipH = axis === 'h' ? !store.state.flipH : store.state.flipH;
        const flipV = axis === 'v' ? !store.state.flipV : store.state.flipV;
        store.patch({ flipH, flipV });
        persistFlips(flipH, flipV);
        void refreshDisplay();
      };

      /** The persisted snapshot of everything this row controls. */
      const currentView = () => ({
        zoom: store.state.zoom,
        panX: store.state.panX,
        panY: store.state.panY,
        rx: store.state.rx,
        ry: store.state.ry,
        rw: store.state.rw,
        rh: store.state.rh,
      });

      actions.setZoom = (value) => {
        const next = clampZoom(value);
        if (next === store.state.zoom) return;
        store.patch({ zoom: next });
        persistView(currentView());
        renderImageCss();
      };

      /** Move the visible slice; the caller decides when it becomes durable. */
      actions.setView = (x, y, persist = true) => {
        const panX = clampPercent(x);
        const panY = clampPercent(y);
        if (panX === store.state.panX && panY === store.state.panY) return;
        store.patch({ panX, panY });
        if (persist) persistView(currentView());
        renderImageCss();
      };

      /** Set the whole rectangle (used by the edge drag handles and sliders). */
      actions.setRegionRect = (rect, persist = true) => {
        const next = clampRegion(rect);
        const cur = store.state;
        if (
          next.x === cur.rx &&
          next.y === cur.ry &&
          next.w === cur.rw &&
          next.h === cur.rh
        ) {
          return;
        }
        store.patch({ rx: next.x, ry: next.y, rw: next.w, rh: next.h });
        if (persist) persistView(currentView());
        renderImageCss();
      };

      actions.resetView = () => {
        store.patch({
          zoom: DEFAULT_VIEW.zoom,
          panX: DEFAULT_VIEW.panX,
          panY: DEFAULT_VIEW.panY,
          rx: DEFAULT_REGION.x,
          ry: DEFAULT_REGION.y,
          rw: DEFAULT_REGION.w,
          rh: DEFAULT_REGION.h,
        });
        persistView(currentView());
        renderImageCss();
      };

      /** Called once the drag ends, so a drag writes storage only once. */
      actions.persistView = () => {
        persistView(currentView());
      };

      deleteActions.requestDelete = (sessionId, displayTitle, running) => {
        deleteStore.set({ sessionId, title: displayTitle, running: running === true });
      };

      ctx.effect(
        () => ctx.locale.register(DELETE_NS, { zh: deleteZh, en: deleteEn }),
        'feature-pack: delete dictionaries',
      );
      ctx.effect(
        () => ctx.locale.register(SKIN_NS, { zh: skinZh, en: skinEn }),
        'feature-pack: skin dictionaries',
      );
      // The veil color follows the base palette, so a light/dark switch or an
      // Appearance change repaints the picture layer too.
      ctx.effect(() => {
        const off = ctx.on('theme/change', () => renderImageCss());
        return () => off();
      }, 'feature-pack: veil');
      // The picture is sized in viewport units, so a window resize needs a
      // repaint even though the settings row may not be mounted at that time.
      ctx.effect(() => {
        let frame = 0;
        const onResize = () => {
          if (frame !== 0) return;
          frame = window.requestAnimationFrame(() => {
            frame = 0;
            renderImageCss();
          });
        };
        window.addEventListener('resize', onResize);
        return () => {
          window.removeEventListener('resize', onResize);
          if (frame !== 0) window.cancelAnimationFrame(frame);
        };
      }, 'feature-pack: viewport');
      ctx.effect(
        () => () => {
          disposed = true;
          styleTag.remove();
          imageTag.remove();
          layerDispose?.();
          layerDispose = undefined;
          if (objectUrl !== null) {
            URL.revokeObjectURL(objectUrl);
            objectUrl = null;
          }
          sourceBlob = null;
        },
        'feature-pack: styles and layers',
      );

      const flips = readFlips();
      const view = readView();
      store.patch({
        opacity: readOpacity(),
        flipH: flips.h,
        flipV: flips.v,
        ...view,
      });
      refresh();

      readStoredImage()
        .then((blob) => {
          if (blob === null || disposed) return;
          sourceBlob = blob;
          void refreshDisplay();
        })
        .catch(() => {
          /* No stored image, or storage blocked: the feature stays available. */
        });

      ctx.slots.inject('sidebar.workspaces.session.menu.item', () =>
        ctx.slots.register(
          {
            name: 'sidebar.workspaces.session.menu.item',
            id: 'feature-pack-session-delete',
            order: 461,
            locale: DELETE_NS,
            inject: () => ({ requestDelete: deleteActions.requestDelete }),
          },
          DeleteMenuItem,
        ),
      );

      ctx.slots.inject('shell.overlay', () =>
        ctx.slots.register(
          { name: 'shell.overlay', id: 'feature-pack-delete-dialog', order: 121, locale: DELETE_NS },
          DeleteDialog,
        ),
      );

      ctx.slots.inject('settings.general.item', () =>
        ctx.slots.register(
          { name: 'settings.general.item', id: 'image-skin', order: 13, locale: SKIN_NS },
          ImageRow,
        ),
      );
    }

    return {
      inject: ['slots', 'locale', 'theme'],
      apply,
    };
  },
});
