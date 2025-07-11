import pyautogui
import random
import time

def random_mouse_movement():
    screen_width, screen_height = pyautogui.size()
    x = random.randint(screen_width // 3, 2 * screen_width // 3)
    y = random.randint(screen_height // 3, 2 * screen_height // 3)
    pyautogui.moveTo(x, y, duration=random.uniform(0.5, 1.5))
    time.sleep(random.uniform(1, 3))  # Pause after moving

def switch_tabs():
    pyautogui.keyDown('alt')
    pyautogui.press('tab')
    pyautogui.keyUp('alt')
    time.sleep(random.uniform(1, 3))  # Pause after switching tabs

def random_scroll():
    scroll_amount = random.choice([-10, 10])  # Scroll up or down randomly
    pyautogui.scroll(scroll_amount)
    time.sleep(random.uniform(1, 3))  # Pause after scrolling

while True:
    action = random.choice(["move", "switch", "scroll"])
    
    if action == "move":
        random_mouse_movement()
    elif action == "switch":
        switch_tabs()
    elif action == "scroll":
        random_scroll()

    time.sleep(random.uniform(3, 6))  # Longer pause between actions