import { Link } from 'react-router-dom';

export default function NotAllowedPage() {
  return (
    <section className="card notice-page">
      <h1>You do not have access to this page</h1>
      <p>This page is for administrators. If you think you should have access, ask an administrator.</p>
      <p>
        <Link to="/">Back to the reports</Link>
      </p>
    </section>
  );
}
