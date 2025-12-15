// Dashboard.tsx
export default function Dashboard() {
  return (
    <div style={{ padding: 24 }}>
      <h2>Dashboard</h2>

      <div style={{
        display: "flex",
        gap: 16,
        flexWrap: "wrap"
      }}>
        <div style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          width: 220
        }}>
          <div>毎日30分勉強する</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            学習基盤づくり
          </div>
        </div>

        <div style={{
          border: "1px solid #ddd",
          borderRadius: 8,
          padding: 12,
          width: 220
        }}>
          <div>復習する</div>
          <div style={{ fontSize: 12, color: "#666" }}>
            学習基盤づくり
          </div>
        </div>
      </div>
    </div>
  );
}
