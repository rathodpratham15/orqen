import "@/App.css";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "sonner";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import Editor from "@/pages/Editor";
import Runs from "@/pages/Runs";
import RunDetail from "@/pages/RunDetail";
import Approvals from "@/pages/Approvals";
import Analytics from "@/pages/Analytics";
import { DataProvider } from "@/lib/dataStore";

function App() {
  return (
    <div className="App dark">
      <DataProvider>
        <BrowserRouter>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/runs" element={<Runs />} />
              <Route path="/runs/:id" element={<RunDetail />} />
              <Route path="/approvals" element={<Approvals />} />
              <Route path="/analytics" element={<Analytics />} />
            </Route>
            {/* Editor is full-screen, outside main layout */}
            <Route path="/editor/:id" element={<Editor />} />
          </Routes>
        </BrowserRouter>
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: "#12121A",
              border: "1px solid #1E1E2E",
              color: "#F1F5F9",
            },
          }}
        />
      </DataProvider>
    </div>
  );
}

export default App;
