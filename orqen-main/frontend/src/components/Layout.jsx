import { Outlet } from "react-router-dom";
import Sidebar from "@/components/Sidebar";

export default function Layout() {
  return (
    <div className="min-h-screen flex bg-background text-foreground" data-testid="app-layout">
      <Sidebar />
      <main className="flex-1 ml-16 overflow-x-hidden">
        <Outlet />
      </main>
    </div>
  );
}
