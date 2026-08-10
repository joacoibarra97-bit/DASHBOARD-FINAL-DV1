// Generado a partir de content/dashboard-body.html — no editar a mano.
export const DASHBOARD_BODY_HTML = `
<div class="topbar">
  <div class="topbar-inner">
    <div>
      <p class="brand-eyebrow">Panel de control · 8 locales</p>
      <h1 class="brand-title">Central de Pedidos</h1>
      <p class="brand-sub">Rappi · PedidosYa · C.A.T. (Delivery + Menú Día + PO) — datos filtrados sin abandonos ni cancelados</p>
    </div>
    <div style="display:flex;align-items:center;gap:10px;">
      <a href="/generar" style="font-family:'SF Mono',monospace;font-size:12px;background:#EE9D2B;color:#14213D;padding:8px 14px;border-radius:100px;text-decoration:none;font-weight:700;">+ Cargar mes nuevo</a>
      <div class="month-select" id="monthSelect"></div>
      <a href="/api/logout" style="font-family:'SF Mono',monospace;font-size:11px;color:#9aa3bc;text-decoration:none;margin-left:4px;">Salir</a>
    </div>
  </div>
</div>

<div class="tabbar">
  <div class="tabbar-inner" id="tabBar"></div>
</div>

<div class="wrap" id="mainWrap"></div>

<div class="reset-bar">
  <span class="footer-note" id="footerNote"></span>
  <div style="display:flex;flex-direction:column;align-items:flex-end;gap:6px;">
    <div style="display:flex;gap:10px;flex-wrap:wrap;">
      <button class="reset-btn" id="resetBtn" style="display: none;">↺ Restaurar datos originales de esta vista</button>
      <button class="reset-btn" id="saveBtn" style="background:#2F7B6E;color:#fff;border-color:#2F7B6E;">☁ Guardar cambios en el sitio</button>
      <button class="reset-btn" id="exportBtn" style="background:var(--ink);color:#fff;border-color:var(--ink);">⬇ Descargar copia (.html)</button>
    </div>
    <span class="footer-note" style="text-align:right;">Usá este botón para guardar tus cambios — "Guardar como" del navegador no conserva las ediciones.</span>
  </div>
</div>
`;
