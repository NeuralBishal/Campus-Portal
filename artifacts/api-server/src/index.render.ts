import app from "./app";

const PORT = process.env.PORT || 3000;

// Simple server startup for Render
const server = app.listen(PORT, () => {
  console.log(`✅ Campus Portal API running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
  console.log(`🔗 Health check: http://localhost:${PORT}/api/health`);
});

// Graceful shutdown for Render
process.on("SIGTERM", () => {
  console.log("SIGTERM received, closing server...");
  server.close(() => {
    console.log("Server closed");
    process.exit(0);
  });
});
