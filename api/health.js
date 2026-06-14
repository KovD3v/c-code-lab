export default function handler(req, res) {
  res.status(200).json({ ok: true, runtime: 'vercel', runner: 'browser-only', apiRun: false });
}
