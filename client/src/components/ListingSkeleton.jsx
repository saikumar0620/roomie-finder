export default function ListingSkeleton() {
  return (
    <div className="card" style={{ padding: 0 }}>
      <div className="skel" style={{ height: 200, borderRadius: "16px 16px 0 0" }} />
      <div style={{ padding: "16px 20px 20px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="skel" style={{ height: 16, width: "70%" }} />
        <div className="skel" style={{ height: 13, width: "45%" }} />
        <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
          <div className="skel" style={{ height: 24, width: 60, borderRadius: 100 }} />
          <div className="skel" style={{ height: 24, width: 80, borderRadius: 100 }} />
        </div>
        <div className="skel" style={{ height: 34, borderRadius: 10, marginTop: 4 }} />
      </div>
    </div>
  );
}