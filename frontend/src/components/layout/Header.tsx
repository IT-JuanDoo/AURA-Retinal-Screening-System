// TODO: Import necessary dependencies

const Header = () => {
  // TODO: Get user info from auth context/store

  return (
    <header className="header">
      <div className="header-content">
        <h1>AURA</h1>
        <nav>
          {/* TODO: Add navigation links */}
          <a href="/">Home</a>
          {/* TODO: Add user menu */}
        </nav>
      </div>
    </header>
  );
};

export default Header;

