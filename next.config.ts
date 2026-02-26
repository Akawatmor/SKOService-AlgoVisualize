//import type { NextConfig } from "next";

/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export', // เพิ่มบรรทัดนี้
  // แนะนำให้ใส่ trailingSlash: true ถ้าต้องการให้ URL สวยงาม (เช่น /about/ แทน /about.html)
  trailingSlash: true, 
  // หากมีการใช้ next/image ต้องตั้งค่า images: { unoptimized: true } ด้วย เพราะ static ไม่มี server ทำ image optimization
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
