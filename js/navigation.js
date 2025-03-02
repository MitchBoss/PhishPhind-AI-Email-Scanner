/**
 * navigation.js - Central configuration and management for navigation components
 * 
 * This file provides a centralized configuration for the application's 
 * navigation components (navbar and sidebar) and handles their initialization.
 */

const NavigationManager = (function() {
  // State
  let state = {
    navbarInstance: null,
    sidebarInstance: null,
    initialized: false,
    activeModule: null
  };

  // Config - Navigation Items
  const navigationConfig = {
    // Horizontal navbar items
    items: [
      {
        id: 'home',
        text: 'Home',
        url: '#',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7m-14 0l2 2m0 0l7 7 7-7m-14 0l2-2" /></svg>',
        active: true
      },
      {
        id: 'email-analysis',
        text: 'Email Analysis',
        url: '#analysis',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>'
      },
      {
        id: 'history',
        text: 'History',
        url: '#history',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
      }
    ],
    
    // Actions for the navbar
    actions: [
      {
        id: 'about',
        text: 'About',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>',
        showText: true,
        onClick: function() {
          if (window.ModalModules && typeof window.ModalModules.showModal === 'function') {
            window.ModalModules.showModal('about');
          } else if (window.ModuleManager) {
            // Fallback to loading directly if ModalModules is not available
            window.ModuleManager.loadModule('about');
          }
        }
      },
      {
        id: 'settings',
        text: 'Settings',
        icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>',
        showText: true,
        onClick: function() {
          if (window.ModalModules && typeof window.ModalModules.showModal === 'function') {
            window.ModalModules.showModal('settings');
          } else if (window.ModuleManager) {
            // Fallback to loading directly if ModalModules is not available
            window.ModuleManager.loadModule('settings');
          }
        }
      }
    ],
    
    // Sidebar sections
    sections: [
      {
        title: 'Analysis Tools',
        items: [
          {
            id: 'analysis',
            text: 'Email Analysis',
            url: '#',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>',
            active: true
          },
          {
            id: 'history',
            text: 'Analysis History',
            url: '#history',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
          }
        ]
      },
      {
        title: 'Configuration',
        items: [
          {
            id: 'settings',
            text: 'Settings',
            url: '#settings',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>'
          },
          {
            id: 'about',
            text: 'About',
            url: '#about',
            icon: '<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>'
          }
        ]
      }
    ]
  };

  /**
   * Initialize navigation components
   */
  async function init() {
    try {
      // Create only the navbar component, skip sidebar
      const navbar = await createNavbar();
      
      // Set up event listeners for navbar
      setupEventListeners();
      
      console.log('Navigation initialized with horizontal navbar only');
      
      return true;
    } catch (error) {
      console.error('Error initializing navigation:', error);
      return false;
    }
  }
  
  /**
   * Create the navbar component
   */
  async function createNavbar() {
    try {
      console.log('Creating navbar with items:', navigationConfig.items?.length || 0);
      
      // Use simplified direct DOM creation to ensure navbar always renders correctly
      const navbarElement = document.createElement('nav');
      navbarElement.id = 'main-navbar';
      navbarElement.className = 'navbar navbar--fixed navbar--primary';
      navbarElement.setAttribute('role', 'navigation');
      navbarElement.setAttribute('aria-label', 'Main Navigation');
      
      // Use the existing horizontal navbar items
      const uniqueItems = navigationConfig.items || [];
      
      console.log('Using navbar items:', uniqueItems.length);
      
      // Create navbar content
      let navbarContent = `
        <div class="navbar__brand">
          <img src="assets/icons/icon.svg" alt="PhishPhind Logo" class="navbar__logo">
          <div>
            <span class="navbar__title">PhishPhind</span>
            <span class="navbar__subtitle">AI Email Scanner</span>
          </div>
        </div>
        <ul class="navbar__nav" style="display: flex !important; flex-direction: row !important;">
      `;
      
      // Add all unique items
      uniqueItems.forEach(item => {
        navbarContent += `
          <li class="navbar__item ${item.active ? 'navbar__item--active' : ''}" data-id="${item.id}">
            <a href="${item.url || '#'}" class="navbar__link" data-id="${item.id}">
              ${item.icon ? `<span class="navbar__link-icon">${item.icon}</span>` : ''}
              ${item.text}
            </a>
          </li>
        `;
      });
      
      // Complete navbar layout
      navbarContent += `
        </ul>
        <div class="navbar__actions">
      `;
      
      // Add action buttons if they exist
      if (navigationConfig.actions) {
        navigationConfig.actions.forEach(action => {
          navbarContent += `
            <button class="navbar__action ${action.showText ? 'navbar__action--with-text' : ''}" 
                    title="${action.text || ''}" data-id="${action.id}">
              ${action.icon ? `<span class="navbar__action-icon">${action.icon}</span>` : ''}
              ${action.showText ? `<span class="navbar__action-text">${action.text}</span>` : ''}
            </button>
          `;
        });
      }
      
      // Close navbar elements
      navbarContent += `
        </div>
      `;
      
      navbarElement.innerHTML = navbarContent;
      
      // Find navbar container
      const navbarContainer = document.getElementById('navbarContainer');
      if (navbarContainer) {
        // Clear existing content and add navbar
        navbarContainer.innerHTML = '';
        navbarContainer.appendChild(navbarElement);
        
        // Store navbar instance
        state.navbarInstance = navbarElement;
        
        console.log('Navbar created successfully with', uniqueItems.length, 'items');
      } else {
        console.error('Navbar container not found');
      }
      
      return navbarElement;
    } catch (error) {
      console.error('Error creating navbar:', error);
      return null;
    }
  }
  
  /**
   * Create the sidebar component
   */
  async function createSidebar() {
    try {
      // Attempt to create sidebar using the component loader
      console.log('Creating sidebar with sections:', navigationConfig.sections);
      
      // Print the structure of the first section for debugging
      if (navigationConfig.sections && navigationConfig.sections.length > 0) {
        console.log('First section detail:', {
          title: navigationConfig.sections[0].title,
          itemsCount: navigationConfig.sections[0].items ? navigationConfig.sections[0].items.length : 0,
          firstItem: navigationConfig.sections[0].items && navigationConfig.sections[0].items.length > 0 ? 
                     navigationConfig.sections[0].items[0] : null
        });
      }
      
      // Add direct DOM creation to ensure the sidebar is always constructed properly
      const sidebarElement = document.createElement('div');
      sidebarElement.id = 'main-sidebar';
      sidebarElement.className = 'sidebar';
      sidebarElement.setAttribute('role', 'navigation');
      sidebarElement.setAttribute('aria-label', 'Main Navigation');
      
      // Create sidebar content
      let sidebarContent = `
        <div class="sidebar__header">
          <h2 class="sidebar__title">Navigation</h2>
        </div>
      `;
      
      // Add sections directly (skipping the template system which might be failing)
      if (navigationConfig.sections && navigationConfig.sections.length > 0) {
        navigationConfig.sections.forEach(section => {
          // Add section title if it exists
          if (section.title) {
            sidebarContent += `<h3 class="sidebar__section-title">${section.title}</h3>`;
          }
          
          // Start navigation list
          sidebarContent += `<ul class="sidebar__nav" role="menu">`;
          
          // Add items if they exist
          if (section.items && section.items.length > 0) {
            section.items.forEach(item => {
              sidebarContent += `
                <li class="sidebar__item" role="menuitem" data-id="${item.id}">
                  <a href="${item.url || '#'}" class="sidebar__link ${item.active ? 'sidebar__link--active' : ''}" 
                     data-id="${item.id}" ${item.action ? 'data-action="' + item.action + '"' : ''}>
                    ${item.icon ? `<span class="sidebar__link-icon">${item.icon}</span>` : ''}
                    <span class="sidebar__link-text">${item.text}</span>
                  </a>
                </li>
              `;
            });
          }
          
          // End navigation list
          sidebarContent += `</ul>`;
        });
      }
      
      sidebarElement.innerHTML = sidebarContent;
      
      // Find the sidebar container
      const sidebarContainer = document.getElementById('sidebarContainer');
      if (!sidebarContainer) {
        console.error('Sidebar container not found - creating a new one');
        
        // Create and add a sidebar container
        const newContainer = document.createElement('div');
        newContainer.id = 'sidebarContainer';
        newContainer.className = 'fixed left-0 top-16 z-40 h-[calc(100vh-60px)]';
        
        // Insert container into the DOM
        const main = document.getElementById('mainContent');
        if (main && main.parentNode) {
          main.parentNode.insertBefore(newContainer, main);
        } else {
          document.body.appendChild(newContainer);
        }
        
        // Add the sidebar to the container
        newContainer.appendChild(sidebarElement);
      } else {
        // Add the sidebar to the existing container
        sidebarContainer.innerHTML = '';
        sidebarContainer.appendChild(sidebarElement);
      }
      
      console.log('Direct sidebar created with items:', sidebarElement.querySelectorAll('.sidebar__item').length);
      
      // Attach event listeners to all sidebar links
      const sidebarLinks = sidebarElement.querySelectorAll('.sidebar__link');
      sidebarLinks.forEach(link => {
        link.addEventListener('click', handleSidebarItemClick);
      });
      
      // Set up sidebar toggle functionality
      setupSidebarToggle();
      
      // Store the sidebar instance
      state.sidebarInstance = sidebarElement;
      
      return sidebarElement;
    } catch (e) {
      console.error('Error creating sidebar:', e);
      createFallbackSidebar();
    }
  }
  
  /**
   * Creates a fallback sidebar when the component loader fails
   */
  function createFallbackSidebar() {
    console.log('Creating fallback sidebar manually');
    
    // Create a fallback sidebar manually
    const fallbackSidebar = document.createElement('div');
    fallbackSidebar.id = 'main-sidebar';
    fallbackSidebar.className = 'sidebar';
    fallbackSidebar.setAttribute('role', 'navigation');
    fallbackSidebar.setAttribute('aria-label', 'Main Navigation');
    
    // Create sidebar content
    let sidebarContent = `
      <div class="sidebar__header">
        <h2 class="sidebar__title">Navigation</h2>
      </div>
    `;
    
    // Add sections
    if (navigationConfig.sections && navigationConfig.sections.length > 0) {
      navigationConfig.sections.forEach(section => {
        // Add section title if it exists
        if (section.title) {
          sidebarContent += `<h3 class="sidebar__section-title">${section.title}</h3>`;
        }
        
        // Start navigation list
        sidebarContent += `<ul class="sidebar__nav" role="menu">`;
        
        // Add items if they exist
        if (section.items && section.items.length > 0) {
          section.items.forEach(item => {
            sidebarContent += `
              <li class="sidebar__item" role="menuitem" data-id="${item.id}">
                <a href="${item.url || '#'}" class="sidebar__link ${item.active ? 'sidebar__link--active' : ''}" 
                   data-id="${item.id}" ${item.action ? 'data-action="' + item.action + '"' : ''}>
                  ${item.icon ? `<span class="sidebar__link-icon">${item.icon}</span>` : ''}
                  <span class="sidebar__link-text">${item.text}</span>
                </a>
              </li>
            `;
          });
        }
        
        // End navigation list
        sidebarContent += `</ul>`;
      });
    }
    
    fallbackSidebar.innerHTML = sidebarContent;
    
    // Find the sidebar container
    const sidebarContainer = document.getElementById('sidebarContainer');
    if (sidebarContainer) {
      // Clear any existing content and append the sidebar
      sidebarContainer.innerHTML = '';
      sidebarContainer.appendChild(fallbackSidebar);
      
      // Attach event listeners to the sidebar items
      const sidebarLinks = fallbackSidebar.querySelectorAll('.sidebar__link');
      sidebarLinks.forEach(link => {
        link.addEventListener('click', handleSidebarItemClick);
      });
      
      console.log('Fallback sidebar created with', sidebarLinks.length, 'items');
      
      // Store the sidebar instance
      state.sidebarInstance = fallbackSidebar;
      
      // Setup sidebar toggle functionality
      setupSidebarToggle();
    } else {
      console.error('Sidebar container not found for fallback sidebar');
      
      // Create a sidebar container if it doesn't exist as a last resort
      const newSidebarContainer = document.createElement('div');
      newSidebarContainer.id = 'sidebarContainer';
      newSidebarContainer.className = 'fixed left-0 top-16 z-40 h-[calc(100vh-60px)]';
      
      // Add the container to the body
      document.body.insertBefore(newSidebarContainer, document.getElementById('mainContent'));
      
      // Add the sidebar to the new container
      newSidebarContainer.appendChild(fallbackSidebar);
      
      // Store the sidebar instance
      state.sidebarInstance = fallbackSidebar;
      
      console.log('Created new sidebar container and added fallback sidebar');
    }
  }
  
  /**
   * Set up event listeners for navigation components
   */
  function setupEventListeners() {
    try {
      console.log('Setting up navigation event listeners');
      
      // Navbar toggle button for sidebar
      if (state.navbarInstance && state.navbarInstance instanceof Element) {
        // Find toggle button
        const toggleButton = state.navbarInstance.querySelector('[data-navbar-toggle]');
        console.log('Toggle button found:', toggleButton ? 'yes' : 'no');
        
        if (toggleButton) {
          // Remove any existing listeners to avoid duplicates
          toggleButton.removeEventListener('click', toggleSidebar);
          
          // Add new listener with direct function reference
          toggleButton.addEventListener('click', function(e) {
            e.preventDefault();
            console.log('Toggle button clicked');
            toggleSidebar();
          });
          
          console.log('Added click listener to toggle button');
        } else {
          // Try to find via different selector as fallback
          const fallbackToggle = state.navbarInstance.querySelector('.navbar__toggle') || 
                                state.navbarInstance.querySelector('.menu-toggle') ||
                                document.querySelector('[data-navbar-toggle]');
          
          if (fallbackToggle) {
            console.log('Found toggle button via fallback selector');
            fallbackToggle.removeEventListener('click', toggleSidebar);
            fallbackToggle.addEventListener('click', function(e) {
              e.preventDefault();
              console.log('Fallback toggle button clicked');
              toggleSidebar();
            });
          }
        }
        
        // Navigation item clicks
        const navItems = state.navbarInstance.querySelectorAll('.navbar__item');
        navItems?.forEach(item => {
          if (item) {
            item.removeEventListener('click', handleNavItemClick);
            item.addEventListener('click', handleNavItemClick);
          }
        });
        
        // Add event listeners for navbar action buttons
        const actionButtons = state.navbarInstance.querySelectorAll('.navbar__action');
        console.log('Found navbar action buttons:', actionButtons?.length || 0);
        actionButtons?.forEach(button => {
          if (button) {
            // Remove existing listeners to prevent duplicates
            button.removeEventListener('click', handleNavActionClick);
            // Add new click listener
            button.addEventListener('click', handleNavActionClick);
          }
        });
      }
      
      // Sidebar items
      if (state.sidebarInstance && state.sidebarInstance instanceof Element) {
        const sidebarItems = state.sidebarInstance.querySelectorAll('.sidebar__item');
        
        // Debug the sidebar DOM structure
        console.log('Looking for sidebar items with class .sidebar__item');
        console.log('Sidebar DOM structure:', state.sidebarInstance.outerHTML.substring(0, 200) + '...');
        
        if (sidebarItems && sidebarItems.length > 0) {
          sidebarItems.forEach(item => {
            if (item) {
              // Remove any existing listener first
              const link = item.querySelector('.sidebar__link');
              const itemId = item.getAttribute('data-id') || link?.getAttribute('data-id');
              
              if (link) {
                link.removeEventListener('click', handleSidebarItemClick);
                link.addEventListener('click', function(e) {
                  e.preventDefault();
                  console.log('Sidebar item clicked:', itemId);
                  
                  if (itemId && window.ModuleManager && 
                      ['about', 'settings', 'history', 'analysis'].includes(itemId)) {
                    window.ModuleManager.loadModule(itemId);
                  }
                  
                  // On mobile, close the sidebar after item click
                  if (window.innerWidth < 768) {
                    toggleSidebar();
                  }
                });
              }
            }
          });
          console.log('Added click listeners to', sidebarItems.length, 'sidebar items');
        } else {
          console.warn('No sidebar items found');
          
          // If no sidebar items are found, try adding them manually
          if (navigationConfig.sections && navigationConfig.sections.length > 0) {
            console.log('Attempting to create sidebar items manually from config');
            
            // For each section that should exist
            navigationConfig.sections.forEach(section => {
              // Find or create section title
              let sectionTitle = null;
              const sectionTitles = state.sidebarInstance.querySelectorAll('.sidebar__section-title');
              for (let i = 0; i < sectionTitles.length; i++) {
                if (sectionTitles[i].textContent === section.title) {
                  sectionTitle = sectionTitles[i];
                  break;
                }
              }
              
              let sectionContainer;
              
              if (!sectionTitle) {
                // Create a new section
                sectionContainer = document.createElement('div');
                sectionContainer.className = 'sidebar__section';
                sectionTitle = document.createElement('h3');
                sectionTitle.className = 'sidebar__section-title';
                sectionTitle.textContent = section.title;
                sectionContainer.appendChild(sectionTitle);
                
                // Create list container
                const ul = document.createElement('ul');
                ul.className = 'sidebar__nav';
                sectionContainer.appendChild(ul);
                
                // Add to sidebar
                state.sidebarInstance.appendChild(sectionContainer);
              } else {
                // Find the closest section container
                sectionContainer = sectionTitle.closest('.sidebar__section') || 
                                   sectionTitle.parentElement;
              }
              
              // Find or create nav list
              let navList = sectionContainer.querySelector('.sidebar__nav');
              if (!navList) {
                navList = document.createElement('ul');
                navList.className = 'sidebar__nav';
                sectionContainer.appendChild(navList);
              }
              
              // Add items to the section
              section.items.forEach(item => {
                const li = document.createElement('li');
                li.className = 'sidebar__item';
                li.setAttribute('data-id', item.id);
                
                const a = document.createElement('a');
                a.className = `sidebar__link ${item.active ? 'sidebar__link--active' : ''}`;
                a.href = item.url;
                
                const iconSpan = document.createElement('span');
                iconSpan.className = 'sidebar__link-icon';
                iconSpan.innerHTML = item.icon;
                
                const textSpan = document.createElement('span');
                textSpan.className = 'sidebar__link-text';
                textSpan.textContent = item.text;
                
                a.appendChild(iconSpan);
                a.appendChild(textSpan);
                li.appendChild(a);
                navList.appendChild(li);
                
                // Add event listener
                a.addEventListener('click', function(e) {
                  e.preventDefault();
                  console.log('Manual sidebar item clicked:', item.id);
                  
                  if (item.id && window.ModuleManager && 
                      ['about', 'settings', 'history', 'analysis'].includes(item.id)) {
                    window.ModuleManager.loadModule(item.id);
                  }
                  
                  // On mobile, close the sidebar after item click
                  if (window.innerWidth < 768) {
                    toggleSidebar();
                  }
                });
              });
            });
            
            console.log('Manual sidebar items created, count:', 
                        state.sidebarInstance.querySelectorAll('.sidebar__item').length);
          }
        }
      } else {
        console.warn('Sidebar is not a DOM element, cannot attach event listeners');
        
        // Try to find sidebar items directly as fallback
        const fallbackItems = document.querySelectorAll('.sidebar__item');
        if (fallbackItems && fallbackItems.length > 0) {
          console.log('Found sidebar items via direct query, attaching listeners');
          fallbackItems.forEach(item => {
            if (item) {
              item.removeEventListener('click', handleSidebarItemClick);
              item.addEventListener('click', handleSidebarItemClick);
            }
          });
        }
      }
      
      // Listen for module changes
      if (window.EventBus) {
        window.EventBus.subscribe('module:loaded', handleModuleLoaded);
      }
      
      console.log('Navigation event listeners setup completed');
    } catch (error) {
      console.error('Error setting up navigation event listeners:', error);
    }
  }
  
  /**
   * Toggle the sidebar visibility
   */
  function toggleSidebar() {
    try {
      console.log('Toggle sidebar called');
      
      if (!state.sidebarInstance || !(state.sidebarInstance instanceof Element)) {
        console.warn('Sidebar instance not found or not a DOM element');
        state.sidebarInstance = document.querySelector('#main-sidebar') || document.querySelector('.sidebar');
        
        if (!state.sidebarInstance) {
          console.error('Could not find sidebar element - creating a minimal one');
          
          // Create a minimal emergency sidebar
          const emergencySidebar = document.createElement('div');
          emergencySidebar.id = 'main-sidebar';
          emergencySidebar.className = 'sidebar';
          
          // Create basic content
          emergencySidebar.innerHTML = `
            <div class="sidebar__header">
              <h2 class="sidebar__title">Navigation</h2>
            </div>
            <ul class="sidebar__nav">
              <li class="sidebar__item">
                <a href="#" class="sidebar__link">
                  <span class="sidebar__link-text">Home</span>
                </a>
              </li>
            </ul>
          `;
          
          // Find or create container
          let container = document.getElementById('sidebarContainer');
          if (!container) {
            container = document.createElement('div');
            container.id = 'sidebarContainer';
            container.className = 'fixed left-0 top-16 z-40 h-[calc(100vh-60px)]';
            document.body.appendChild(container);
          }
          
          container.appendChild(emergencySidebar);
          state.sidebarInstance = emergencySidebar;
        }
      }
      
      // Debug sidebar state before toggle
      console.log('Sidebar before toggle:', {
        id: state.sidebarInstance.id,
        classList: Array.from(state.sidebarInstance.classList),
        visible: state.sidebarInstance.classList.contains('sidebar--visible'),
      });
      
      // Toggle visibility class
      state.sidebarInstance.classList.toggle('sidebar--visible');
      
      // Create or get overlay
      let overlay = document.querySelector('.sidebar__overlay');
      if (!overlay) {
        overlay = document.createElement('div');
        overlay.className = 'sidebar__overlay';
        document.body.appendChild(overlay);
        
        // Add click event to overlay to close sidebar
        overlay.addEventListener('click', closeSidebar);
      }
      
      // Toggle overlay visibility
      overlay.classList.toggle('sidebar__overlay--visible');
      
      // Debug sidebar state after toggle
      console.log('Sidebar after toggle:', {
        id: state.sidebarInstance.id,
        classList: Array.from(state.sidebarInstance.classList),
        visible: state.sidebarInstance.classList.contains('sidebar--visible')
      });
    } catch (error) {
      console.error('Error toggling sidebar:', error);
    }
  }
  
  /**
   * Handle navigation item click
   */
  function handleNavItemClick(event) {
    try {
      const item = event.currentTarget;
      const itemId = item.getAttribute('data-id');
      
      if (itemId) {
        setActiveItem(itemId);
        
        // If it's a module link, load the module
        if (window.ModuleManager && ['about', 'settings', 'history', 'analysis'].includes(itemId)) {
          window.ModuleManager.loadModule(itemId);
        }
      }
    } catch (error) {
      console.error('Error handling nav item click:', error);
    }
  }
  
  /**
   * Handle navbar action button clicks
   */
  function handleNavActionClick(event) {
    try {
      const button = event.currentTarget;
      const actionId = button.getAttribute('data-id');
      
      console.log('Navbar action clicked:', actionId);
      
      if (actionId) {
        // Find the matching action in config
        const actionConfig = navigationConfig.actions.find(a => a.id === actionId);
        
        if (actionConfig && typeof actionConfig.onClick === 'function') {
          console.log('Executing onClick handler for action:', actionId);
          actionConfig.onClick();
        } else if (window.ModuleManager && ['about', 'settings', 'history', 'analysis'].includes(actionId)) {
          // Fallback to module loading
          console.log('Loading module for action:', actionId);
          window.ModuleManager.loadModule(actionId);
        }
      }
    } catch (error) {
      console.error('Error handling navbar action click:', error);
    }
  }
  
  /**
   * Handle sidebar item click
   */
  function handleSidebarItemClick(event) {
    event.preventDefault();
    
    const link = event.currentTarget;
    const itemId = link.getAttribute('data-id');
    const action = link.getAttribute('data-action');
    
    console.log('Sidebar item clicked:', itemId);
    
    // Handle the action if specified
    if (action) {
      console.log('Executing action:', action);
      // You could add custom action handling here
    } else if (itemId) {
      // For about and settings, show in modal
      if (['about', 'settings'].includes(itemId) && window.ModalModules && typeof window.ModalModules.showModal === 'function') {
        window.ModalModules.showModal(itemId);
      } 
      // For other modules or if ModalModules is not available, load directly
      else if (window.ModuleManager) {
        window.ModuleManager.loadModule(itemId);
      }
    }
    
    // On mobile, close the sidebar after click
    if (window.innerWidth < 768) {
      closeSidebar();
    }
  }
  
  /**
   * Handle module loaded event
   */
  function handleModuleLoaded(data) {
    try {
      if (data && data.moduleId) {
        setActiveItem(data.moduleId);
        state.activeModule = data.moduleId;
      }
    } catch (error) {
      console.error('Error handling module loaded event:', error);
    }
  }
  
  /**
   * Set the active navigation item
   */
  function setActiveItem(itemId) {
    try {
      // Update navbar items
      if (state.navbarInstance && state.navbarInstance instanceof Element) {
        const navItems = state.navbarInstance.querySelectorAll('.navbar__item');
        navItems.forEach(item => {
          const id = item.getAttribute('data-id');
          if (id === itemId) {
            item.classList.add('navbar__item--active');
          } else {
            item.classList.remove('navbar__item--active');
          }
        });
      }
      
      // Update sidebar items
      if (state.sidebarInstance && state.sidebarInstance instanceof Element) {
        const sidebarItems = state.sidebarInstance.querySelectorAll('.sidebar__item');
        sidebarItems.forEach(item => {
          const id = item.getAttribute('data-id');
          if (id === itemId) {
            item.classList.add('sidebar__item--active');
          } else {
            item.classList.remove('sidebar__item--active');
          }
        });
      }
    } catch (error) {
      console.error('Error setting active navigation item:', error);
    }
  }
  
  /**
   * Sets up sidebar toggle functionality
   */
  function setupSidebarToggle() {
    const toggleButton = document.querySelector('[data-sidebar-toggle]');
    const sidebar = document.getElementById('main-sidebar');
    const overlay = document.querySelector('.sidebar__overlay');
    
    if (toggleButton) {
      toggleButton.addEventListener('click', function() {
        sidebar.classList.toggle('sidebar--collapsed');
      });
    }
    
    if (overlay) {
      overlay.addEventListener('click', closeSidebar);
    }
  }
  
  /**
   * Closes the sidebar (for mobile)
   */
  function closeSidebar() {
    try {
      const sidebar = document.getElementById('main-sidebar') || document.querySelector('.sidebar');
      if (sidebar) {
        sidebar.classList.remove('sidebar--visible');
        
        // Hide overlay if it exists
        const overlay = document.querySelector('.sidebar__overlay');
        if (overlay) {
          overlay.classList.remove('sidebar__overlay--visible');
        }
      }
    } catch (error) {
      console.error('Error closing sidebar:', error);
    }
  }
  
  // Public API
  return {
    init,
    createNavbar,
    createSidebar,
    toggleSidebar,
    setActiveItem
  };
})();

// Auto-initialize if document is already loaded
if (document.readyState === 'complete') {
  NavigationManager.init();
} else {
  window.addEventListener('load', function() {
    NavigationManager.init();
  });
} 