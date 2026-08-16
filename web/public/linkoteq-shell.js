(() => {
  const home = 'https://linkoteq.com';
  const wSection = 'https://wsection.linkoteq.com/';
  const snow = 'https://snow.linkoteq.com/';
  const discovery = 'https://discovery.linkoteq.com/';
  const timesheet = 'https://timesheet.linkoteq.com/';
  const header = document.createElement('header');
  header.className = 'globalHeader';
  header.innerHTML = `
    <div class="utilityBar">
      <a class="utilityBrand" href="${home}/" aria-label="LinkoTech home"><img src="/linko-logo-final.svg" alt="LinkoTech Engineering Technology"></a>
      <nav class="utilityNav" aria-label="Utility navigation">
        <a href="${home}/">Home</a>
        <div class="navMenu"><button class="navMenuButton" type="button">Contact ▾</button><div class="navDropdown"><a href="${home}/contact">Contact Us</a><a href="${discovery}">Customer Discovery</a><a href="${home}/contact/support">Support</a></div></div>
        <div class="navMenu"><button class="navMenuButton" type="button">About ▾</button><div class="navDropdown"><a href="${home}/about">About Linko</a><a href="${timesheet}">Team Timesheet</a></div></div>
        <a href="${home}/pricing">Pricing</a>
        <div class="navMenu"><button class="navMenuButton" type="button">Calculators ▾</button><div class="navDropdown"><a href="${wSection}">W-Section</a><a href="${snow}" aria-current="page">Snow Load</a></div></div>
      </nav>
      <div class="navMenu signInMenu"><button class="navCta navMenuButton" type="button">Sign In ▾</button><div class="navDropdown signInDropdown"><a href="${home}/blog/login">Employee Workspace</a><a href="${home}/customer-login">Client Workspace</a></div></div>
    </div>
    <nav class="primaryBar" aria-label="Primary navigation"><a href="${home}/">Home</a><a href="${home}/#platform">AI Platform</a><a href="${home}/#roadmap">Roadmap</a><a href="${home}/knowledge/documentation">Knowledge Center</a><a href="${home}/blog">Blog</a></nav>`;
  const root = document.getElementById('root');
  if (root) root.before(header);

  const footer = document.createElement('footer');
  footer.className = 'linkoShellFooter';
  footer.innerHTML = `<img src="/linko-logo-final.svg" alt="LinkoTech Engineering Technology"><p>Engineering Intelligence For Connected Digital Workflows.</p><span>© 2026 Linko Technology. All Rights Reserved.</span>`;
  if (root) root.after(footer);
})();