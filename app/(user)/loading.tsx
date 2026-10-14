export default function PublicPageLoading() {
    return <div className="public-ui min-h-screen pb-16 pt-32" role="status" aria-busy="true">
    <div className="public-container">
    <p className="public-eyebrow">AirBharath</p>
    <h1 className="font-outfit text-3xl">Loading this page</h1>
    <p className="public-copy">Getting the latest information. Please wait.</p>
    <div aria-hidden="true" className="public-course-grid mt-8">{[0, 1, 2].map(item => <div key={item} className="h-64 rounded-xl border border-border bg-muted"/>)}</div>
    </div>
    </div>;
}
