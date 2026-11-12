(() => {
 const home='https://linkoteq.com';
 const tools=[
  {name:'3D Model',href:'https://3dmodel.linkoteq.com/',status:'Beta'},
  {name:'W-Section',href:'https://wsection.linkoteq.com/',status:'Trial'},
  {name:'Snow Load',href:'https://snow.linkoteq.com/',status:'Trial'}
 ];
 const header=document.createElement('header');
 header.className='globalHeader';
 const productLinks=tools.map(t=>'<a href="'+t.href+'">'+t.name+' <span class="toolStatus">'+t.status+'</span></a>').join('');
 header.innerHTML='<div class="utilityBar"><a class="utilityBrand" href="'+home+'/" aria-label="Linkoteq home"><img src="'+home+'/linko-logo-final.svg" alt="LinkoTech Engineering Technology"></a><nav class="utilityNav" aria-label="Linkoteq navigation"><a href="'+home+'/">Home</a><a href="'+home+'/contact">Contact</a><a href="'+home+'/about">About</a><a href="'+home+'/pricing">Pricing</a><div class="navMenu"><button class="navMenuButton" type="button">Calculators ▾</button><div class="navDropdown">'+productLinks+'</div></div></nav><a class="navCta" href="'+home+'/customer-login">Sign In</a><button class="mobileMenuToggle" type="button" aria-expanded="false" aria-controls="linkoteq-mobile-menu">Menu ☰</button></div><nav id="linkoteq-mobile-menu" class="mobileMenuPanel" aria-label="Mobile navigation"><a href="'+home+'/">Home</a><span class="mobileGroupLabel">Engineering software</span>'+productLinks+'<span class="mobileGroupLabel">Explore</span><a href="'+home+'/blog">Blog</a><a href="'+home+'/knowledge/documentation">Documentation</a><a href="'+home+'/pricing">Pricing</a><a href="'+home+'/about">About</a><a href="'+home+'/contact">Contact</a><a href="'+home+'/customer-login">Client Sign In</a></nav><nav class="primaryBar" aria-label="Primary navigation"><a href="'+home+'/">Home</a><a href="'+home+'/#platform">AI Platform</a><a href="'+home+'/#roadmap">Roadmap</a><a href="'+home+'/knowledge/documentation">Knowledge Center</a><a href="'+home+'/blog">Blog</a></nav>';
 const root=document.getElementById('root');if(!root)return;root.before(header);
 const button=header.querySelector('.mobileMenuToggle');
 const menu=header.querySelector('#linkoteq-mobile-menu');
 button.addEventListener('click',()=>{const isOpen=button.getAttribute('aria-expanded')!=='true';button.setAttribute('aria-expanded',String(isOpen));button.textContent=isOpen?'Close ×':'Menu ☰';menu.classList.toggle('isOpen',isOpen)});
 const footer=document.createElement('footer');footer.className='linkoShellFooter';footer.innerHTML='<img src="'+home+'/linko-logo-final.svg" alt="LinkoTech Engineering Technology"><p>Engineering Intelligence For Connected Digital Workflows.</p><span>© 2026 Linko Technology. All Rights Reserved.</span>';root.after(footer);
})();
