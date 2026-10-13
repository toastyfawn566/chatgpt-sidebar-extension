/**
 * ChatGPT Sidebar - Options Page Script
 * 
 * Manages the settings interface for customizing prompts:
 * - Add, edit, delete, reorder prompts
 * - Enable/disable individual prompts
 * - Restore default prompts
 * - Temporary trash for deleted prompts
 * 
 * @author toastyfawn566
 * @version 1.3.0
 */

// =============================================================================
// DEFAULT PROMPTS
// =============================================================================

/**
 * Default page prompts - restored when user clicks "Restore Defaults"
 */
const DEFAULT_PAGE_PROMPTS = [
  { id: 'page-summarize', name: 'Summarize this page', template: 'Please summarize this webpage:', includeUrl: true },
  { id: 'page-explain', name: 'Explain this page', template: 'Please explain what this webpage is about:', includeUrl: true },
  { id: 'page-questions', name: 'What questions should I ask?', template: 'What are some good questions I should ask about this webpage?', includeUrl: true },
  { id: 'page-send-url', name: 'Send page URL', template: '', includeUrl: true }
];

/**
 * Default selection prompts - restored when user clicks "Restore Defaults"
 */
const DEFAULT_SELECTION_PROMPTS = [
  { id: 'chatgpt-explain', name: 'Explain this', template: 'Explain this:\n\n{text}' },
  { id: 'chatgpt-summarize', name: 'Summarize', template: 'Summarize this:\n\n{text}' },
  { id: 'chatgpt-translate', name: 'Translate to English', template: 'Translate this to English:\n\n{text}' },
  { id: 'chatgpt-grammar', name: 'Fix grammar', template: 'Fix the grammar in this:\n\n{text}' },
  { id: 'chatgpt-code', name: 'Explain code', template: 'Explain what this code does:\n\n{text}' },
  { id: 'chatgpt-bugs', name: 'Find bugs', template: 'Find bugs in this code:\n\n{text}' }
];

// =============================================================================
// DOM ELEMENTS
// =============================================================================

// Lists
const pagePromptsList = document.getElementById('page-prompts-list');
const selectionPromptsList = document.getElementById('selection-prompts-list');

// Edit Modal
const modal = document.getElementById('modal');
const modalTitle = document.getElementById('modal-title');
const modalClose = document.getElementById('modal-close');
const modalCancel = document.getElementById('modal-cancel');
const promptForm = document.getElementById('prompt-form');
const promptNameInput = document.getElementById('prompt-name');
const promptTemplateInput = document.getElementById('prompt-template');
const templateHint = document.getElementById('template-hint');
const includeUrlGroup = document.getElementById('include-url-group');
const promptIncludeUrl = document.getElementById('prompt-include-url');

// Trash Modal
const trashModal = document.getElementById('trash-modal');
const trashModalClose = document.getElementById('trash-modal-close');
const trashList = document.getElementById('trash-list');
const trashEmpty = document.getElementById('trash-empty');
const trashCount = document.getElementById('trash-count');
const openTrashBtn = document.getElementById('open-trash');
const emptyTrashBtn = document.getElementById('empty-trash');
const trashDoneBtn = document.getElementById('trash-done');

// Confirm Modal
const confirmModal = document.getElementById('confirm-modal');
const confirmClose = document.getElementById('confirm-close');
const confirmCancel = document.getElementById('confirm-cancel');
const confirmYes = document.getElementById('confirm-yes');
const restoreDefaultsBtn = document.getElementById('restore-defaults');

// Other
const modalBackdrop = document.getElementById('modal-backdrop');
const toast = document.getElementById('toast');
const toastMessage = document.getElementById('toast-message');

// Global Settings
const autoSubmitToggle = document.getElementById('auto-submit-toggle');
const temporaryChatToggle = document.getElementById('temporary-chat-toggle');

// Chrome commands have fixed key slots; settings choose the prompt in each slot.
const DEFAULT_SHORTCUT_PROMPTS = {
  'send-prompt-1': 'chatgpt-explain',
  'send-prompt-2': 'chatgpt-summarize',
  'send-prompt-3': 'chatgpt-translate'
};
let keyboardPromptBindings = { ...DEFAULT_SHORTCUT_PROMPTS };

// =============================================================================
// STATE
// =============================================================================

let pagePrompts = [];
let selectionPrompts = [];
let trash = [];  // Session-only trash (cleared on page close)
let editingPrompt = null;
let editingType = null;  // 'page' or 'selection'

// =============================================================================
// INITIALIZATION
// =============================================================================

document.addEventListener('DOMContentLoaded', loadSettings);

// Add button handlers
document.querySelectorAll('[data-add]').forEach(btn => {
  btn.addEventListener('click', () => openAddModal(btn.dataset.add));
});

// Edit modal handlers
modalClose.addEventListener('click', closeEditModal);
modalCancel.addEventListener('click', closeEditModal);
promptForm.addEventListener('submit', handleFormSubmit);

// Trash modal handlers
trashModalClose.addEventListener('click', closeTrashModal);
trashDoneBtn.addEventListener('click', closeTrashModal);
openTrashBtn.addEventListener('click', openTrashModal);
emptyTrashBtn.addEventListener('click', emptyTrash);

// Confirm modal handlers
restoreDefaultsBtn.addEventListener('click', openConfirmModal);
confirmClose.addEventListener('click', closeConfirmModal);
confirmCancel.addEventListener('click', closeConfirmModal);
confirmYes.addEventListener('click', handleRestoreDefaults);

// Backdrop closes all modals
modalBackdrop.addEventListener('click', closeAllModals);

// ESC key closes modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closeAllModals();
});

// Auto-submit toggle handler
autoSubmitToggle.addEventListener('change', async () => {
  await chrome.storage.sync.set({ autoSubmit: autoSubmitToggle.checked });
  showToast(autoSubmitToggle.checked ? 'Auto-submit enabled' : 'Auto-submit disabled');
});

// Temporary Chat is applied to the next sidebar instance.
temporaryChatToggle.addEventListener('change', async () => {
  await chrome.storage.sync.set({ openTemporaryChat: temporaryChatToggle.checked });
  showToast('Reopen the sidebar to apply this setting');
});

// Assign a configured text prompt to each native Chrome shortcut.
document.querySelectorAll('.prompt-shortcut-select').forEach(select => {
  select.addEventListener('change', async () => {
    keyboardPromptBindings[select.dataset.command] = select.value;
    await chrome.storage.sync.set({ keyboardPromptBindings });
    showToast('Shortcut prompt saved');
  });
});

// =============================================================================
// DATA MANAGEMENT
// =============================================================================

/**
 * Loads saved prompts from Chrome storage
 */
async function loadSettings() {
  const result = await chrome.storage.sync.get(['pagePrompts', 'selectionPrompts', 'autoSubmit', 'openTemporaryChat', 'keyboardPromptBindings']);
  
  pagePrompts = result.pagePrompts || DEFAULT_PAGE_PROMPTS.map(p => ({ ...p, enabled: true }));
  selectionPrompts = result.selectionPrompts || DEFAULT_SELECTION_PROMPTS.map(p => ({ ...p, enabled: true }));
  
  // Load global settings and prompt-to-shortcut assignments.
  autoSubmitToggle.checked = result.autoSubmit === true;
  temporaryChatToggle.checked = result.openTemporaryChat === true;
  keyboardPromptBindings = { ...DEFAULT_SHORTCUT_PROMPTS, ...result.keyboardPromptBindings };
  
  renderPromptLists();
  updateTrashCount();
}

/**
 * Saves prompts to Chrome storage and rebuilds context menus
 */
async function saveSettings() {
  await chrome.storage.sync.set({ pagePrompts, selectionPrompts });
  chrome.runtime.sendMessage({ type: 'REBUILD_MENUS' });
}

// =============================================================================
// RENDERING
// =============================================================================

/**
 * Renders both prompt lists
 */
function renderPromptLists() {
  renderList(pagePromptsList, pagePrompts, 'page');
  renderList(selectionPromptsList, selectionPrompts, 'selection');
  renderShortcutSettings();
}

/**
 * Populate the shortcut selectors from the current text prompts.
 */
function renderShortcutSettings() {
  document.querySelectorAll('.prompt-shortcut-select').forEach(select => {
    const command = select.dataset.command;
    select.replaceChildren(new Option('Disabled', ''));
    selectionPrompts.filter(p => p.enabled !== false).forEach(prompt => {
      select.appendChild(new Option(prompt.name, prompt.id));
    });
    select.value = keyboardPromptBindings[command] || '';
    if (select.selectedIndex < 0) select.value = '';
  });

  chrome.commands.getAll().then(commands => {
    commands.forEach(command => {
      const keyLabel = document.querySelector(
        `.shortcut-keys[data-command="${command.name}"]`
      );
      if (keyLabel) keyLabel.textContent = `(${command.shortcut || 'not assigned'})`;
    });
  }).catch(error => console.warn('Could not retrieve shortcut assignments', error));
}

/**
 * Renders a single prompt list
 * @param {Element} container - DOM container
 * @param {Array} prompts - Array of prompts
 * @param {string} type - 'page' or 'selection'
 */
function renderList(container, prompts, type) {
  container.innerHTML = '';
  
  if (prompts.length === 0) {
    container.innerHTML = '<div class="empty-state">No prompts. Click + Add to create one.</div>';
    return;
  }
  
  prompts.forEach((prompt, index) => {
    const enabled = prompt.enabled !== false;
    const isFirst = index === 0;
    const isLast = index === prompts.length - 1;
    
    const item = document.createElement('div');
    item.className = 'prompt-item' + (enabled ? '' : ' disabled');
    item.innerHTML = `
      <div class="prompt-order">
        <button class="btn btn-icon" data-action="up" data-type="${type}" data-index="${index}" title="Move up" ${isFirst ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="18 15 12 9 6 15"/>
          </svg>
        </button>
        <button class="btn btn-icon" data-action="down" data-type="${type}" data-index="${index}" title="Move down" ${isLast ? 'disabled' : ''}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"/>
          </svg>
        </button>
      </div>
      <div class="prompt-toggle">
        <label class="toggle-switch">
          <input type="checkbox" ${enabled ? 'checked' : ''} data-type="${type}" data-index="${index}">
          <span class="toggle-slider"></span>
        </label>
      </div>
      <div class="prompt-info">
        <span class="prompt-name">${escapeHtml(prompt.name)}</span>
      </div>
      <div class="prompt-actions">
        <button class="btn btn-icon" data-action="edit" data-type="${type}" data-index="${index}" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn btn-icon delete" data-action="delete" data-type="${type}" data-index="${index}" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </div>
    `;
    container.appendChild(item);
  });
  
  // Attach event listeners
  container.querySelectorAll('input[type="checkbox"]').forEach(el => {
    el.addEventListener('change', handleToggle);
  });
  container.querySelectorAll('[data-action]').forEach(el => {
    el.addEventListener('click', handleAction);
  });
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

/**
 * Handles enable/disable toggle for prompts
 */
function handleToggle(e) {
  const { type, index } = e.target.dataset;
  const prompts = type === 'page' ? pagePrompts : selectionPrompts;
  prompts[index].enabled = e.target.checked;
  saveSettings();
  renderPromptLists();
}

/**
 * Handles action button clicks (edit, delete, move)
 */
function handleAction(e) {
  const btn = e.currentTarget;
  if (btn.disabled) return;
  
  const { action, type, index } = btn.dataset;
  const prompts = type === 'page' ? pagePrompts : selectionPrompts;
  const idx = parseInt(index);
  
  switch (action) {
    case 'edit':
      openEditModal(prompts[idx], type, idx);
      break;
    case 'delete':
      deletePrompt(type, idx);
      break;
    case 'up':
      movePrompt(type, idx, -1);
      break;
    case 'down':
      movePrompt(type, idx, 1);
      break;
  }
}

/**
 * Moves a prompt up or down in the list
 * @param {string} type - 'page' or 'selection'
 * @param {number} index - Current position
 * @param {number} direction - -1 for up, 1 for down
 */
function movePrompt(type, index, direction) {
  const prompts = type === 'page' ? pagePrompts : selectionPrompts;
  const newIndex = index + direction;
  
  if (newIndex < 0 || newIndex >= prompts.length) return;
  
  // Swap positions
  [prompts[index], prompts[newIndex]] = [prompts[newIndex], prompts[index]];
  
  saveSettings();
  renderPromptLists();
}

// =============================================================================
// EDIT MODAL
// =============================================================================

/**
 * Opens modal for adding a new prompt
 * @param {string} type - 'page' or 'selection'
 */
function openAddModal(type) {
  editingPrompt = null;
  editingType = type;
  modalTitle.textContent = type === 'page' ? 'Add Page Prompt' : 'Add Text Prompt';
  promptNameInput.value = '';
  promptTemplateInput.value = '';
  
  if (type === 'page') {
    includeUrlGroup.classList.remove('hidden');
    promptIncludeUrl.checked = true;
    templateHint.textContent = 'Or use {title} and {url} placeholders manually';
  } else {
    includeUrlGroup.classList.add('hidden');
    templateHint.textContent = 'Use {text} for selected text';
  }
  
  showModal(modal);
  promptNameInput.focus();
}

/**
 * Opens modal for editing an existing prompt
 * @param {Object} prompt - The prompt to edit
 * @param {string} type - 'page' or 'selection'
 * @param {number} index - Index in the array
 */
function openEditModal(prompt, type, index) {
  editingPrompt = { ...prompt, index };
  editingType = type;
  modalTitle.textContent = 'Edit Prompt';
  promptNameInput.value = prompt.name;
  promptTemplateInput.value = prompt.template;
  
  if (type === 'page') {
    includeUrlGroup.classList.remove('hidden');
    promptIncludeUrl.checked = prompt.includeUrl !== false;
    templateHint.textContent = 'Or use {title} and {url} placeholders manually';
  } else {
    includeUrlGroup.classList.add('hidden');
    templateHint.textContent = 'Use {text} for selected text';
  }
  
  showModal(modal);
  promptNameInput.focus();
}

/**
 * Closes the edit modal
 */
function closeEditModal() {
  modal.classList.add('hidden');
  modalBackdrop.classList.add('hidden');
  editingPrompt = null;
  editingType = null;
}

/**
 * Handles form submission for add/edit
 */
function handleFormSubmit(e) {
  e.preventDefault();
  
  const name = promptNameInput.value.trim();
  const template = promptTemplateInput.value.trim();
  
  if (!name) return;
  
  const prompts = editingType === 'page' ? pagePrompts : selectionPrompts;
  
  if (editingPrompt && editingPrompt.index !== undefined) {
    // Update existing
    prompts[editingPrompt.index].name = name;
    prompts[editingPrompt.index].template = template;
    if (editingType === 'page') {
      prompts[editingPrompt.index].includeUrl = promptIncludeUrl.checked;
    }
    showToast('Prompt updated');
  } else {
    // Add new
    const newPrompt = {
      id: 'custom_' + Date.now(),
      name,
      template,
      enabled: true
    };
    if (editingType === 'page') {
      newPrompt.includeUrl = promptIncludeUrl.checked;
    }
    prompts.push(newPrompt);
    showToast('Prompt added');
  }
  
  saveSettings();
  renderPromptLists();
  closeEditModal();
}

// =============================================================================
// DELETE & TRASH
// =============================================================================

/**
 * Deletes a prompt (moves to trash)
 * @param {string} type - 'page' or 'selection'
 * @param {number} index - Index to delete
 */
function deletePrompt(type, index) {
  const prompts = type === 'page' ? pagePrompts : selectionPrompts;
  const deleted = prompts.splice(index, 1)[0];
  
  trash.push({ type, prompt: deleted });
  updateTrashCount();
  
  saveSettings();
  renderPromptLists();
  showToast('Moved to trash');
}

/**
 * Updates the trash count badge
 */
function updateTrashCount() {
  if (trash.length > 0) {
    trashCount.textContent = trash.length;
    trashCount.classList.remove('hidden');
  } else {
    trashCount.classList.add('hidden');
  }
}

// =============================================================================
// TRASH MODAL
// =============================================================================

/**
 * Opens the trash modal
 */
function openTrashModal() {
  renderTrash();
  showModal(trashModal);
}

/**
 * Closes the trash modal
 */
function closeTrashModal() {
  trashModal.classList.add('hidden');
  modalBackdrop.classList.add('hidden');
}

/**
 * Renders the trash list
 */
function renderTrash() {
  trashList.innerHTML = '';
  
  if (trash.length === 0) {
    trashEmpty.classList.remove('hidden');
    trashList.classList.add('hidden');
    return;
  }
  
  trashEmpty.classList.add('hidden');
  trashList.classList.remove('hidden');
  
  trash.forEach((item, index) => {
    const el = document.createElement('div');
    el.className = 'trash-item';
    el.innerHTML = `
      <div class="prompt-info">
        <span class="prompt-name">${escapeHtml(item.prompt.name)}</span>
        <span class="prompt-type">${item.type === 'page' ? 'Page prompt' : 'Text prompt'}</span>
      </div>
      <div class="prompt-actions">
        <button class="btn btn-icon restore" data-index="${index}" title="Restore">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/>
            <path d="M3 3v5h5"/>
          </svg>
        </button>
        <button class="btn btn-icon delete" data-index="${index}" title="Delete permanently">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>
      </div>
    `;
    trashList.appendChild(el);
  });
  
  // Attach event listeners
  trashList.querySelectorAll('.restore').forEach(btn => {
    btn.addEventListener('click', () => restoreFromTrash(parseInt(btn.dataset.index)));
  });
  
  trashList.querySelectorAll('.delete').forEach(btn => {
    btn.addEventListener('click', () => permanentDelete(parseInt(btn.dataset.index)));
  });
}

/**
 * Restores a prompt from trash
 * @param {number} index - Index in trash array
 */
function restoreFromTrash(index) {
  const item = trash.splice(index, 1)[0];
  const prompts = item.type === 'page' ? pagePrompts : selectionPrompts;
  prompts.push(item.prompt);
  
  updateTrashCount();
  renderTrash();
  saveSettings();
  renderPromptLists();
  showToast('Prompt restored');
}

/**
 * Permanently deletes a prompt from trash
 * @param {number} index - Index in trash array
 */
function permanentDelete(index) {
  trash.splice(index, 1);
  updateTrashCount();
  renderTrash();
  showToast('Deleted permanently');
}

/**
 * Empties the entire trash
 */
function emptyTrash() {
  trash = [];
  updateTrashCount();
  renderTrash();
  showToast('Trash emptied');
}

// =============================================================================
// RESTORE DEFAULTS
// =============================================================================

/**
 * Opens the confirmation modal for restoring defaults
 */
function openConfirmModal() {
  showModal(confirmModal);
}

/**
 * Closes the confirmation modal
 */
function closeConfirmModal() {
  confirmModal.classList.add('hidden');
  modalBackdrop.classList.add('hidden');
}

/**
 * Restores default prompts (adds back any missing defaults)
 */
function handleRestoreDefaults() {
  // Add back any missing page prompts
  DEFAULT_PAGE_PROMPTS.forEach(defaultPrompt => {
    if (!pagePrompts.find(p => p.id === defaultPrompt.id)) {
      pagePrompts.push({ ...defaultPrompt, enabled: true });
    }
  });
  
  // Add back any missing selection prompts
  DEFAULT_SELECTION_PROMPTS.forEach(defaultPrompt => {
    if (!selectionPrompts.find(p => p.id === defaultPrompt.id)) {
      selectionPrompts.push({ ...defaultPrompt, enabled: true });
    }
  });
  
  saveSettings();
  renderPromptLists();
  closeConfirmModal();
  showToast('Default prompts restored');
}

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

/**
 * Shows a modal with backdrop
 * @param {Element} modalElement - Modal to show
 */
function showModal(modalElement) {
  modalElement.classList.remove('hidden');
  modalBackdrop.classList.remove('hidden');
}

/**
 * Closes all modals
 */
function closeAllModals() {
  modal.classList.add('hidden');
  trashModal.classList.add('hidden');
  confirmModal.classList.add('hidden');
  modalBackdrop.classList.add('hidden');
}

/**
 * Shows a toast notification
 * @param {string} message - Message to display
 */
function showToast(message) {
  toastMessage.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 2000);
}

/**
 * Escapes HTML to prevent XSS
 * @param {string} text - Text to escape
 * @returns {string} Escaped HTML
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
