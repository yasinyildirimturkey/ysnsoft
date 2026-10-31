'use client';

import React, { useState } from 'react';
import { Terminal, Copy, Check, Code2, Sparkles, Cpu } from 'lucide-react';

const SNIPPETS = [
  {
    id: 'nextjs-edge',
    title: 'Next.js 16 Edge Cache',
    language: 'typescript',
    file: 'app/api/v1/uyap/status/route.ts',
    code: `import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/auth';
import { redisClient } from '@/lib/redis';

// Turbopack Edge Runtime - 45ms P99 Latency
export const runtime = 'edge';

export async function GET(req: NextRequest) {
  const session = await verifyAuthToken(req);
  if (!session?.lawOfficeId) {
    return NextResponse.json({ error: 'Yetkisiz erişim' }, { status: 401 });
  }

  // Redis in-memory cache lookup
  const cacheKey = \`uyap:cases:\${session.lawOfficeId}\`;
  const cached = await redisClient.get(cacheKey);
  if (cached) {
    return NextResponse.json({ data: JSON.parse(cached), cached: true });
  }

  // Fetch real-time cases and update cache (TTL: 60s)
  const freshData = await fetchLawOfficeCases(session.lawOfficeId);
  await redisClient.set(cacheKey, JSON.stringify(freshData), { ex: 60 });

  return NextResponse.json({ data: freshData, cached: false });
}`
  },
  {
    id: 'python-bot',
    title: 'Python UYAP Robot Worker',
    language: 'python',
    file: 'services/uyap_crawler/robot_worker.py',
    code: `import asyncio
from playwright.async_api import async_playwright
from logger import log_audit_trail

async def run_uyap_case_scan(baro_sicil: str, e_imza_token: str):
    """
    7/24 Kesintisiz Otonom UYAP Dava ve İcra Sorgulama Motoru
    """
    async with async_playwright() as p:
        browser = await p.chromium.launch(headless=True)
        context = await browser.new_context(viewport={'width': 1920, 'height': 1080})
        page = await context.new_page()

        # UYAP Avukat Portalı Güvenli Oturum Başlatma
        await page.goto("https://avukat.uyap.gov.tr/main/login")
        await page.fill("#txtSicil", baro_sicil)
        
        # Otonom Tebligat & Duruşma Taraması
        unseen_docs = await page.locator(".unread-tebligat-row").all()
        for doc in unseen_docs:
            case_id = await doc.get_attribute("data-case-id")
            await notify_lawyer_sms(baro_sicil, case_id)
            await log_audit_trail("UYAP_SYNC_SUCCESS", case_id)

        await browser.close()`
  },
  {
    id: 'threejs-cad',
    title: 'Three.js 3D Harita Stüdyosu',
    language: 'typescript',
    file: 'components/cad/ThreeDStudio.tsx',
    code: `import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// 3194 Md. 18 Bina Gabarisi ve Enine Kesit 3D Render Motoru
export function init3DMapStudio(container: HTMLDivElement, parselData: any) {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f5f7); // Apple Light Canvas

  const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.1, 1000);
  camera.position.set(100, 150, 200);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setSize(container.clientWidth, container.clientHeight);
  container.appendChild(renderer.domElement);

  // Parsel Poligonu & 3D Gabari Hacim Ekstrüzyonu
  const shape = new THREE.Shape();
  parselData.points.forEach((pt: [number, number], i: number) => {
    i === 0 ? shape.moveTo(pt[0], pt[1]) : shape.lineTo(pt[0], pt[1]);
  });

  const extrudeSettings = { depth: parselData.gabariYukseklik, bevelEnabled: false };
  const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
  const material = new THREE.MeshStandardMaterial({ color: 0x0071e3, roughness: 0.3 });
  const buildingMesh = new THREE.Mesh(geometry, material);
  scene.add(buildingMesh);

  return { scene, camera, renderer };
}`
  },
  {
    id: 'socket-tenant',
    title: 'Multi-Tenant Socket Gateway',
    language: 'javascript',
    file: 'server/sockets/multiTenantGateway.js',
    code: `const socketIO = require('socket.io');

// Panelde: 25.000+ Eşzamanlı Acente ve Danışman Canlı İletişim Hattı
function setupTenantSockets(server) {
  const io = socketIO(server, { cors: { origin: "*" } });

  io.use(async (socket, next) => {
    const { tenantId, userId } = socket.handshake.auth;
    if (!tenantId) return next(new Error("Geçersiz Tenant"));
    socket.tenantId = tenantId;
    socket.userId = userId;
    next();
  });

  io.on('connection', (socket) => {
    // Şubeye özel güvenli odaya katılma
    socket.join(\`tenant:\${socket.tenantId}\`);

    // Yeni gayrimenkul talebi düştüğünde anlık eşleşme sinyali
    socket.on('demand:created', (demandData) => {
      socket.to(\`tenant:\${socket.tenantId}\`).emit('demand:matched', demandData);
    });
  });
}`
  }
];

export default function CodeRadar() {
  const [activeSnippet, setActiveSnippet] = useState(0);
  const [copied, setCopied] = useState(false);

  const current = SNIPPETS[activeSnippet];

  const handleCopy = () => {
    navigator.clipboard.writeText(current.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <section className="py-24 bg-[#F5F5F7] border-b border-black/[0.06]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white border border-black/[0.08] text-xs font-semibold text-[#1D1D1F] mb-4 shadow-xs">
            <Terminal className="w-3.5 h-3.5 text-[#0071E3]" />
            <span>Mühendisler İçin Kod Radarı</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-semibold tracking-tight text-[#1D1D1F] mb-4">
            Temiz, tip güvenli ve <br />
            <span className="text-[#0071E3]">üretimde çalışan kaynak kodlar.</span>
          </h2>
          <p className="text-base sm:text-lg text-[#6E6E73]">
            Sadece tasarım değil, arka planda en güncel yazılım standartlarına sadık kalan modüler ve test edilmiş bir mühendislik mimarisi sunuyoruz.
          </p>

          {/* Snippet Tabs */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8">
            {SNIPPETS.map((s, idx) => (
              <button
                key={s.id}
                onClick={() => setActiveSnippet(idx)}
                className={`px-4 py-2 text-xs font-semibold rounded-full transition-all ${
                  activeSnippet === idx
                    ? 'bg-[#1D1D1F] text-white shadow-xs'
                    : 'bg-white text-[#6E6E73] hover:text-[#1D1D1F] border border-black/[0.06]'
                }`}
              >
                {s.title}
              </button>
            ))}
          </div>
        </div>

        {/* Code Terminal Box */}
        <div className="max-w-4xl mx-auto rounded-3xl bg-[#1D1D1F] text-white border border-black/[0.1] shadow-2xl overflow-hidden">
          {/* Terminal Window Bar */}
          <div className="px-5 py-3.5 bg-black/40 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#FF5F56]" />
              <span className="w-3 h-3 rounded-full bg-[#FFBD2E]" />
              <span className="w-3 h-3 rounded-full bg-[#27C93F]" />
              <span className="ml-3 text-xs font-mono text-[#86868B] hidden sm:inline">
                {current.file}
              </span>
            </div>

            <button
              onClick={handleCopy}
              className="px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-medium text-white flex items-center gap-1.5 transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#10B981]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Kopyalandı' : 'Kodu Kopyala'}</span>
            </button>
          </div>

          {/* Code Viewer Body */}
          <div className="p-5 sm:p-6 overflow-x-auto text-xs font-mono leading-relaxed text-[#D2D2D7]">
            <pre>
              <code>{current.code}</code>
            </pre>
          </div>

          {/* Terminal Footer */}
          <div className="px-5 py-2.5 bg-black/30 border-t border-white/5 flex items-center justify-between text-[11px] text-[#86868B]">
            <span>Dil: {current.language.toUpperCase()}</span>
            <span>Zero-Downtime Deployment Ready</span>
          </div>
        </div>

      </div>
    </section>
  );
}
