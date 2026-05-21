use std::os::raw::c_void;

#[repr(C)]
pub struct GhosttyApp {
    _opaque: [u8; 0],
}

#[repr(C)]
pub struct GhosttyConfigFFI {
    _opaque: [u8; 0],
}

#[repr(C)]
pub struct GhosttySurface {
    _opaque: [u8; 0],
}

pub type GhosttyRuntimeWakeupCb = unsafe extern "C" fn(*mut c_void);
pub type GhosttyRuntimeActionCb =
    unsafe extern "C" fn(*mut GhosttyApp, *mut c_void, *mut GhosttyAction);

#[repr(C)]
pub struct GhosttyRuntimeConfig {
    pub userdata: *mut c_void,
    pub wakeup_cb: Option<GhosttyRuntimeWakeupCb>,
    pub action_cb: Option<GhosttyRuntimeActionCb>,
    pub read_clipboard_cb: Option<unsafe extern "C" fn(*mut c_void, *mut GhosttyClipboard)>,
    pub write_clipboard_cb: Option<unsafe extern "C" fn(*mut c_void, *const u8, usize, u32)>,
    pub close_surface_cb: Option<unsafe extern "C" fn(*mut c_void)>,
}

#[repr(C)]
pub struct GhosttyAction {
    pub tag: u32,
    pub data: *mut c_void,
}

#[repr(C)]
pub struct GhosttyClipboard {
    pub data: *mut u8,
    pub len: usize,
}

#[cfg(feature = "ghostty-link")]
#[link(name = "ghostty", kind = "static")]
extern "C" {
    pub fn ghostty_config_new() -> *mut GhosttyConfigFFI;
    pub fn ghostty_config_free(config: *mut GhosttyConfigFFI);
    pub fn ghostty_config_load_default_files(config: *mut GhosttyConfigFFI);
    pub fn ghostty_config_finalize(config: *mut GhosttyConfigFFI) -> bool;

    pub fn ghostty_app_new(
        runtime: *const GhosttyRuntimeConfig,
        config: *mut GhosttyConfigFFI,
    ) -> *mut GhosttyApp;
    pub fn ghostty_app_free(app: *mut GhosttyApp);
    pub fn ghostty_app_tick(app: *mut GhosttyApp);

    pub fn ghostty_surface_new(
        app: *mut GhosttyApp,
        config: *const GhosttySurfaceConfig,
    ) -> *mut GhosttySurface;
    pub fn ghostty_surface_free(surface: *mut GhosttySurface);
    pub fn ghostty_surface_key(surface: *mut GhosttySurface, event: *const GhosttyKeyEvent);
    pub fn ghostty_surface_mouse_button(
        surface: *mut GhosttySurface,
        event: *const GhosttyMouseEvent,
    );
    pub fn ghostty_surface_set_size(surface: *mut GhosttySurface, width: usize, height: usize);
    pub fn ghostty_surface_update(
        surface: *mut GhosttySurface,
        screen: *mut c_void,
        width: usize,
        height: usize,
    );
}

#[repr(C)]
pub struct GhosttySurfaceConfig {
    pub userdata: *mut c_void,
    pub scale_factor: f64,
    pub platform_tag: u32,
}

#[repr(C)]
pub struct GhosttyKeyEvent {
    pub action: u32,
    pub mods: u32,
    pub key: u32,
    pub text: *const u8,
    pub text_len: usize,
}

#[repr(C)]
pub struct GhosttyMouseEvent {
    pub action: u32,
    pub mods: u32,
    pub button: u32,
    pub x: usize,
    pub y: usize,
}
