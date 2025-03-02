/**
 * showcase.js - Component Showcase Initialization Script
 * 
 * This script initializes all component examples for the PhishPhind 
 * Component Showcase page, demonstrating the functionality and configuration
 * options of each component.
 */

document.addEventListener('DOMContentLoaded', async function() {
  // Initialize ComponentLoader
  await ComponentLoader.init();
  
  // Initialize all component demos
  initCardDemos();
  initModalDemos();
  initFormElementDemos();
  initTabComponents();
  initTableComponents();
});

/**
 * Initialize Card Component Demos
 */
async function initCardDemos() {
  // 1. Basic Card
  const basicCardContainer = document.getElementById('basic-card-demo');
  if (basicCardContainer) {
    const basicCard = await ComponentLoader.createCard({
      title: 'Basic Card',
      subtitle: 'Card component example',
      content: '<p>This is a basic card component with title, subtitle, and content.</p>',
      footerContent: '<button class="button button--text">View Details</button>'
    });
    basicCardContainer.appendChild(basicCard);
  }
  
  // 2. Card with Image
  const imageCardContainer = document.getElementById('image-card-demo');
  if (imageCardContainer) {
    const imageCard = await ComponentLoader.createCard({
      title: 'Card with Image',
      image: 'assets/images/placeholder.jpg',
      imageAlt: 'Placeholder image',
      content: '<p>This card includes an image displayed above the content.</p>',
      footerContent: '<button class="button button--text">View Details</button>'
    });
    imageCardContainer.appendChild(imageCard);
  }
  
  // 3. Interactive Card
  const interactiveCardContainer = document.getElementById('interactive-card-demo');
  if (interactiveCardContainer) {
    const interactiveCard = await ComponentLoader.createCard({
      title: 'Interactive Card',
      content: '<p>Click this card to trigger an action. Cards can be made interactive by providing an onClick handler.</p>',
      modifier: 'card--hover',
      onClick: function() {
        alert('Interactive card clicked!');
      }
    });
    interactiveCardContainer.appendChild(interactiveCard);
  }
}

/**
 * Initialize Modal Component Demos
 */
function initModalDemos() {
  // 1. Basic Modal
  const basicModalButton = document.getElementById('show-basic-modal');
  if (basicModalButton) {
    basicModalButton.addEventListener('click', async function() {
      await ComponentLoader.showModal({
        title: 'Basic Modal Example',
        content: '<p>This is a basic modal with a title and content. Click the X or outside the modal to close it.</p>',
        dismissible: true,
        closeOnEsc: true
      });
    });
  }
  
  // 2. Confirmation Modal
  const confirmModalButton = document.getElementById('show-confirm-modal');
  if (confirmModalButton) {
    confirmModalButton.addEventListener('click', async function() {
      const modal = await ComponentLoader.createModal({
        title: 'Confirmation Modal',
        content: '<p>Are you sure you want to perform this action?</p>',
        footerContent: `
          <button class="button button--danger js-confirm">Delete Item</button>
          <button class="button button--secondary js-cancel">Cancel</button>
        `,
        dismissible: false,
        closeOnEsc: false
      });
      
      // Show the modal
      modal.show();
      
      // Set up button handlers
      const confirmButton = modal.element.querySelector('.js-confirm');
      const cancelButton = modal.element.querySelector('.js-cancel');
      
      if (confirmButton) {
        confirmButton.addEventListener('click', function() {
          alert('Action confirmed!');
          modal.hide();
        });
      }
      
      if (cancelButton) {
        cancelButton.addEventListener('click', function() {
          modal.hide();
        });
      }
    });
  }
  
  // 3. Form Modal
  const formModalButton = document.getElementById('show-form-modal');
  if (formModalButton) {
    formModalButton.addEventListener('click', async function() {
      // Create a form to put in the modal
      const form = await ComponentLoader.createForm({
        id: 'modal-form',
        method: 'post',
        content: '', // We'll add form elements programmatically
        submitButtonText: 'Submit',
        cancelButton: true,
        cancelButtonText: 'Cancel'
      });
      
      // Add form elements
      const nameInput = await ComponentLoader.createTextInput({
        id: 'name',
        label: 'Your Name',
        placeholder: 'Enter your name',
        required: true
      });
      
      const emailInput = await ComponentLoader.createTextInput({
        id: 'email',
        label: 'Email Address',
        type: 'email',
        placeholder: 'Enter your email',
        required: true,
        helpText: 'We\'ll never share your email with anyone else.'
      });
      
      // Insert form elements into the form
      const formContent = form.querySelector('.form__content') || form;
      formContent.appendChild(nameInput);
      formContent.appendChild(emailInput);
      
      // Create and show the modal
      const modal = await ComponentLoader.showModal({
        title: 'Contact Form',
        content: form.outerHTML,
        dismissible: true,
        size: 'medium'
      });
      
      // Get the real form within the modal
      const modalForm = modal.element.querySelector('form');
      if (modalForm) {
        modalForm.addEventListener('submit', function(event) {
          event.preventDefault();
          alert('Form submitted!');
          modal.hide();
        });
        
        // Handle cancel button
        const cancelButton = modalForm.querySelector('button[type="button"]');
        if (cancelButton) {
          cancelButton.addEventListener('click', function() {
            modal.hide();
          });
        }
      }
    });
  }
}

/**
 * Initialize Form Elements Demos
 */
async function initFormElementDemos() {
  // 1. Text Inputs Demo
  const textInputsContainer = document.getElementById('text-inputs-demo');
  if (textInputsContainer) {
    // Basic text input
    const basicInput = await ComponentLoader.createTextInput({
      id: 'demo-text',
      name: 'demo-text',
      label: 'Text Input',
      placeholder: 'Enter some text'
    });
    
    // Email input with validation
    const emailInput = await ComponentLoader.createTextInput({
      id: 'demo-email',
      name: 'demo-email',
      label: 'Email Input',
      type: 'email',
      placeholder: 'Enter your email',
      required: true,
      helpText: 'A valid email is required'
    });
    
    // Password input
    const passwordInput = await ComponentLoader.createTextInput({
      id: 'demo-password',
      name: 'demo-password',
      label: 'Password Input',
      type: 'password',
      placeholder: 'Enter password',
      required: true
    });
    
    // Number input
    const numberInput = await ComponentLoader.createTextInput({
      id: 'demo-number',
      name: 'demo-number',
      label: 'Number Input',
      type: 'number',
      placeholder: 'Enter a number',
      min: 1,
      max: 100
    });
    
    // Add all inputs to the container
    textInputsContainer.appendChild(basicInput);
    textInputsContainer.appendChild(emailInput);
    textInputsContainer.appendChild(passwordInput);
    textInputsContainer.appendChild(numberInput);
  }
  
  // 2. Select Dropdowns Demo
  const selectDemoContainer = document.getElementById('select-demo');
  if (selectDemoContainer) {
    // Basic select
    const basicSelect = await ComponentLoader.createSelect({
      id: 'demo-select',
      name: 'demo-select',
      label: 'Select Dropdown',
      placeholder: 'Choose an option',
      options: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3' }
      ]
    });
    
    // Multiple select
    const multiSelect = await ComponentLoader.createSelect({
      id: 'demo-multi-select',
      name: 'demo-multi-select',
      label: 'Multiple Select',
      multiple: true,
      size: 4,
      options: [
        { value: 'option1', label: 'Option 1' },
        { value: 'option2', label: 'Option 2', selected: true },
        { value: 'option3', label: 'Option 3' },
        { value: 'option4', label: 'Option 4', selected: true },
        { value: 'option5', label: 'Option 5' }
      ],
      helpText: 'Hold Ctrl/Cmd to select multiple options'
    });
    
    // Add selects to the container
    selectDemoContainer.appendChild(basicSelect);
    selectDemoContainer.appendChild(multiSelect);
  }
  
  // 3. Checkboxes and Radio Buttons Demo
  const checkboxRadioContainer = document.getElementById('checkbox-radio-demo');
  if (checkboxRadioContainer) {
    // Checkbox
    const checkbox = await ComponentLoader.createCheckbox({
      id: 'demo-checkbox',
      name: 'demo-checkbox',
      label: 'I agree to the terms and conditions',
      required: true
    });
    
    // Radio group
    const radioGroup = await ComponentLoader.createRadioGroup({
      name: 'demo-radio',
      groupLabel: 'Select an option',
      required: true,
      options: [
        { value: 'option1', label: 'Option 1', checked: true },
        { value: 'option2', label: 'Option 2' },
        { value: 'option3', label: 'Option 3', disabled: true }
      ]
    });
    
    // Add to container
    checkboxRadioContainer.appendChild(checkbox);
    checkboxRadioContainer.appendChild(radioGroup);
  }
  
  // 4. Advanced Form Elements Demo
  const advancedInputsContainer = document.getElementById('advanced-inputs-demo');
  if (advancedInputsContainer) {
    // Switch toggle
    const switchToggle = await ComponentLoader.createSwitch({
      id: 'demo-switch',
      name: 'demo-switch',
      label: 'Enable notifications',
      checked: true
    });
    
    // File upload
    const fileUpload = await ComponentLoader.createFileUpload({
      id: 'demo-file',
      name: 'demo-file',
      label: 'Upload a file',
      buttonText: 'Choose file',
      accept: '.pdf,.doc,.docx',
      helpText: 'Accepted file types: PDF, DOC, DOCX'
    });
    
    // Textarea
    const textarea = await ComponentLoader.createTextarea({
      id: 'demo-textarea',
      name: 'demo-textarea',
      label: 'Message',
      placeholder: 'Enter your message here',
      rows: 4,
      maxlength: 500,
      helpText: 'Maximum 500 characters'
    });
    
    // Add to container
    advancedInputsContainer.appendChild(switchToggle);
    advancedInputsContainer.appendChild(fileUpload);
    advancedInputsContainer.appendChild(textarea);
  }
  
  // 5. Complete Form Demo
  const completeFormContainer = document.getElementById('complete-form-demo');
  if (completeFormContainer) {
    // Create a form group for personal info
    const personalInfoGroup = await ComponentLoader.createFormGroup({
      heading: 'Personal Information',
      description: 'Please provide your personal details',
      content: '',
      modifier: 'form-group--bordered'
    });
    
    // Create form elements for the personal info group
    const nameInput = await ComponentLoader.createTextInput({
      id: 'full-name',
      name: 'full-name',
      label: 'Full Name',
      placeholder: 'Enter your full name',
      required: true
    });
    
    const emailInput = await ComponentLoader.createTextInput({
      id: 'email-address',
      name: 'email-address',
      label: 'Email Address',
      type: 'email',
      placeholder: 'Enter your email address',
      required: true
    });
    
    // Add elements to the personal info group
    const personalInfoContent = personalInfoGroup.querySelector('.form-group__content');
    if (personalInfoContent) {
      personalInfoContent.appendChild(nameInput);
      personalInfoContent.appendChild(emailInput);
    }
    
    // Create a form group for account preferences
    const preferencesGroup = await ComponentLoader.createFormGroup({
      heading: 'Account Preferences',
      description: 'Set your account preferences',
      content: '',
      modifier: 'form-group--bordered'
    });
    
    // Create form elements for the preferences group
    const notificationSwitch = await ComponentLoader.createSwitch({
      id: 'notifications',
      name: 'notifications',
      label: 'Enable email notifications',
      checked: true
    });
    
    const themeRadio = await ComponentLoader.createRadioGroup({
      name: 'theme',
      groupLabel: 'Interface Theme',
      options: [
        { value: 'light', label: 'Light', checked: true },
        { value: 'dark', label: 'Dark' },
        { value: 'system', label: 'Use System Preference' }
      ]
    });
    
    // Add elements to the preferences group
    const preferencesContent = preferencesGroup.querySelector('.form-group__content');
    if (preferencesContent) {
      preferencesContent.appendChild(notificationSwitch);
      preferencesContent.appendChild(themeRadio);
    }
    
    // Create the complete form
    const completeForm = await ComponentLoader.createForm({
      id: 'demo-complete-form',
      title: 'Account Settings',
      description: 'Manage your account information and preferences',
      action: '#',
      method: 'post',
      content: '', // We'll add the form groups programmatically
      submitButtonText: 'Save Changes',
      cancelButton: true,
      cancelButtonText: 'Cancel',
      novalidate: true
    });
    
    // Add the form groups to the form
    const formContent = completeForm.querySelector('.form') || completeForm;
    formContent.appendChild(personalInfoGroup);
    formContent.appendChild(preferencesGroup);
    
    // Add the complete form to the container
    completeFormContainer.appendChild(completeForm);
    
    // Handle form submission for demo purposes
    completeForm.addEventListener('submit', function(event) {
      event.preventDefault();
      alert('Form submitted! In a real application, this would save your changes.');
    });
    
    // Handle cancel button
    const cancelButton = completeForm.querySelector('button[type="button"]');
    if (cancelButton) {
      cancelButton.addEventListener('click', function(event) {
        event.preventDefault();
        alert('Changes canceled!');
      });
    }
  }
}

function initTabComponents() {
  // ... existing tab initialization code ...
}

// Initialize Table Components
async function initTableComponents() {
  if (!ComponentLoader) return;

  const tableContainer = document.getElementById('tableComponentsContainer');
  if (!tableContainer) return;
  
  // Basic Table
  const basicTableContainer = document.createElement('div');
  basicTableContainer.className = 'component-demo';
  basicTableContainer.innerHTML = '<h4 class="component-demo__title">Basic Table</h4>' +
    '<p class="component-demo__description">A simple table with sortable columns</p>' +
    '<div id="basicTableDemo"></div>';
  tableContainer.appendChild(basicTableContainer);
  
  const basicTable = await ComponentLoader.createTable({
    id: 'basic-table',
    title: 'User List',
    responsive: true,
    striped: true,
    columns: [
      { key: 'id', label: 'ID', width: '60px' },
      { key: 'name', label: 'Name', sortable: true, sorted: 'asc' },
      { key: 'email', label: 'Email', sortable: true },
      { key: 'role', label: 'Role' }
    ],
    rows: [
      { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Admin' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Editor' },
      { id: '3', name: 'Mike Johnson', email: 'mike@example.com', role: 'User' }
    ]
  });
  document.getElementById('basicTableDemo').appendChild(basicTable);
  
  // Table with Row Actions
  const actionsTableContainer = document.createElement('div');
  actionsTableContainer.className = 'component-demo';
  actionsTableContainer.innerHTML = '<h4 class="component-demo__title">Table with Row Actions</h4>' +
    '<p class="component-demo__description">Table with edit, delete, and view actions for each row</p>' +
    '<div id="actionsTableDemo"></div>';
  tableContainer.appendChild(actionsTableContainer);
  
  const actionsTable = await ComponentLoader.createTable({
    id: 'actions-table',
    title: 'Tasks',
    responsive: true,
    bordered: true,
    columns: [
      { key: 'id', label: 'ID', width: '60px' },
      { key: 'task', label: 'Task', sortable: true },
      { key: 'priority', label: 'Priority' },
      { key: 'dueDate', label: 'Due Date' }
    ],
    rowActions: [
      { 
        type: 'view', 
        action: 'view', 
        label: 'View details', 
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M10.5 8a2.5 2.5 0 1 1-5 0 2.5 2.5 0 0 1 5 0z"/><path d="M0 8s3-5.5 8-5.5S16 8 16 8s-3 5.5-8 5.5S0 8 0 8zm8 3.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7z"/></svg>' 
      },
      { 
        type: 'edit', 
        action: 'edit', 
        label: 'Edit', 
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M12.146.146a.5.5 0 0 1 .708 0l3 3a.5.5 0 0 1 0 .708l-10 10a.5.5 0 0 1-.168.11l-5 2a.5.5 0 0 1-.65-.65l2-5a.5.5 0 0 1 .11-.168l10-10zM11.207 2.5 13.5 4.793 14.793 3.5 12.5 1.207 11.207 2.5zm1.586 3L10.5 3.207 4 9.707V10h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.293l6.5-6.5zm-9.761 5.175-.106.106-1.528 3.821 3.821-1.528.106-.106A.5.5 0 0 1 5 12.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.468-.325z"/></svg>' 
      },
      { 
        type: 'delete', 
        action: 'delete', 
        label: 'Delete', 
        icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5Zm3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0V6Z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1v1ZM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4H4.118ZM2.5 3h11V2h-11v1Z"/></svg>' 
      }
    ],
    rows: [
      { id: '1', task: 'Implement login page', priority: 'High', dueDate: '2023-05-15' },
      { id: '2', task: 'Fix navigation bug', priority: 'Medium', dueDate: '2023-05-20' },
      { id: '3', task: 'Update documentation', priority: 'Low', dueDate: '2023-05-30' }
    ]
  });
  document.getElementById('actionsTableDemo').appendChild(actionsTable);
  
  // Add event listener for the actions table
  actionsTable.addEventListener('table:action', function(event) {
    const { action, rowId } = event.detail;
    console.log(`Table action: ${action} on row ${rowId}`);
    
    // Show a notification to demonstrate the action
    if (ComponentLoader.showNotification) {
      ComponentLoader.showNotification({
        type: action === 'delete' ? 'error' : action === 'edit' ? 'warning' : 'info',
        title: `${action.charAt(0).toUpperCase() + action.slice(1)} Action`,
        message: `You triggered the ${action} action on row ${rowId}`
      });
    }
  });
  
  // Selectable Table with Pagination
  const selectableTableContainer = document.createElement('div');
  selectableTableContainer.className = 'component-demo';
  selectableTableContainer.innerHTML = '<h4 class="component-demo__title">Selectable Table with Pagination</h4>' +
    '<p class="component-demo__description">Table with row selection and pagination controls</p>' +
    '<div id="selectableTableDemo"></div>';
  tableContainer.appendChild(selectableTableContainer);
  
  const selectableTable = await ComponentLoader.createTable({
    id: 'selectable-table',
    title: 'Products',
    headerActions: '<button class="btn btn--secondary btn--sm">Export</button><button class="btn btn--primary btn--sm">Add New</button>',
    responsive: true,
    compact: true,
    selectable: true,
    columns: [
      { key: 'id', label: 'ID', width: '60px' },
      { key: 'name', label: 'Product Name', sortable: true },
      { key: 'category', label: 'Category', sortable: true },
      { key: 'price', label: 'Price', sortable: true },
      { key: 'stock', label: 'Stock' }
    ],
    rows: [
      { id: '1', name: 'Laptop Pro', category: 'Electronics', price: '$999.99', stock: '15' },
      { id: '2', name: 'Wireless Mouse', category: 'Accessories', price: '$24.99', stock: '42' },
      { id: '3', name: 'USB-C Cable', category: 'Cables', price: '$12.99', stock: '108' },
      { id: '4', name: 'Monitor 24"', category: 'Electronics', price: '$249.99', stock: '7' },
      { id: '5', name: 'Wireless Keyboard', category: 'Accessories', price: '$49.99', stock: '23' }
    ],
    pagination: {
      startItem: 1,
      endItem: 5,
      totalItems: 15,
      hasPrevious: false,
      hasNext: true,
      pages: [
        { value: 1, label: '1', active: true },
        { value: 2, label: '2' },
        { value: 3, label: '3' }
      ]
    }
  });
  document.getElementById('selectableTableDemo').appendChild(selectableTable);
  
  // Add event listener for selection changes
  selectableTable.addEventListener('table:selection', function(event) {
    console.log('Selection changed:', event.detail);
  });
  
  // Add event listener for pagination
  selectableTable.addEventListener('table:paginate', function(event) {
    console.log('Pagination requested:', event.detail);
    
    // Show a notification to demonstrate the pagination
    if (ComponentLoader.showNotification) {
      ComponentLoader.showNotification({
        type: 'info',
        title: 'Pagination',
        message: `You requested page: ${event.detail.page}`
      });
    }
  });
  
  // Empty Table
  const emptyTableContainer = document.createElement('div');
  emptyTableContainer.className = 'component-demo';
  emptyTableContainer.innerHTML = '<h4 class="component-demo__title">Empty Table</h4>' +
    '<p class="component-demo__description">Table with no data, showing an empty state</p>' +
    '<div id="emptyTableDemo"></div>';
  tableContainer.appendChild(emptyTableContainer);
  
  const emptyTable = await ComponentLoader.createTable({
    id: 'empty-table',
    title: 'Comments',
    columns: [
      { key: 'id', label: 'ID' },
      { key: 'author', label: 'Author' },
      { key: 'content', label: 'Content' },
      { key: 'date', label: 'Date' }
    ],
    rows: [],
    emptyState: true,
    emptyStateTitle: 'No comments yet',
    emptyStateDescription: 'Be the first to leave a comment on this post'
  });
  document.getElementById('emptyTableDemo').appendChild(emptyTable);
} 