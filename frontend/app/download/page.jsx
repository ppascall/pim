'use client';
export default function DownloadPage() {
  // This will trigger a download when the page is visited
  React.useEffect(() => {
    window.location.href = '/download';
  }, []);
  return <div>Downloading CSV...</div>;
}