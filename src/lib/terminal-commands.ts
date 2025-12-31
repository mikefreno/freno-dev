export interface CommandHistoryItem {
  command: string;
  output: string;
  type: "success" | "error" | "info";
}

export interface CommandContext {
  navigate: (path: string) => void;
  location: { pathname: string };
  addToHistory: (
    cmd: string,
    output: string,
    type: "success" | "error" | "info"
  ) => void;
  triggerCrash?: () => void;
  isDark?: boolean;
}

export const createTerminalCommands = (context: CommandContext) => {
  // Define available routes
  const routes = [
    { path: "/", name: "home" },
    { path: "/blog", name: "blog" },
    { path: "/resume", name: "resume" },
    { path: "/contact", name: "contact" },
    { path: "/downloads", name: "downloads" },
    { path: "/account", name: "account" },
    { path: "/login", name: "login" }
  ];

  const commands: Record<
    string,
    { action: () => void; description: string; hidden?: boolean }
  > = {
    "cd ~": {
      action: () => context.navigate("/"),
      description: "Navigate to home"
    },
    "cd /": {
      action: () => context.navigate("/"),
      description: "Navigate to home"
    },
    "cd ..": {
      action: () => window.history.back(),
      description: "Go back"
    },
    cd: {
      action: () => context.navigate("/"),
      description: "Navigate to home"
    },
    ls: {
      action: () => {
        context.addToHistory(
          "ls",
          "home  blog  resume  contact  downloads  login  account",
          "success"
        );
      },
      description: "List available routes"
    },
    "ls -la": {
      action: () => {
        context.addToHistory(
          "ls -la",
          "drwxr-xr-x  blog/\n-rw-r--r--  resume\n-rw-r--r--  contact\n-rw-r--r--  downloads\n-rw-r--r--  account",
          "success"
        );
      },
      description: "List available routes (detailed)"
    },
    pwd: {
      action: () => {
        context.addToHistory("pwd", context.location.pathname, "success");
      },
      description: "Print current path"
    },
    whoami: {
      action: () => {
        context.addToHistory("whoami", "guest", "success");
      },
      description: "Show current user"
    },
    help: {
      action: () => {
        const helpText = Object.entries(commands)
          .filter(([, info]) => !info.hidden)
          .map(([cmd, info]) => `  ${cmd.padEnd(20)} - ${info.description}`)
          .join("\n");
        context.addToHistory(
          "help",
          `Available commands:\n${helpText}`,
          "info"
        );
      },
      description: "Show this help message"
    },
    clear: {
      action: () => {
        context.addToHistory("clear", "", "info");
        // Clear will be handled by the component
      },
      description: "Clear terminal history"
    },
    exit: {
      action: () => context.navigate("/"),
      description: "Exit (go home)"
    },
    crash: {
      action: () => {
        if (context.triggerCrash) {
          context.triggerCrash();
        } else {
          throw new Error("💣");
        }
      },
      description: "💣"
    },
    "sudo rm -rf /": {
      action: () => {
        context.addToHistory(
          "sudo rm -rf /",
          "Hey man... \nthat's like... not very cool.",
          "error"
        );
      },
      description: "Don't try this at home, kids"
    },
    cowsay: {
      action: () => {
        context.addToHistory(
          "cowsay",
          " ___________\n< You're lost! >\n -----------\n        \\   ^__^\n         \\  (oo)\\_______\n            (__)\\       )\\/\\\n                ||----w |\n                ||     ||",
          "success"
        );
      },
      description: "Make the cow speak"
    },
    fortune: {
      action: () => {
        const fortunes = [
          "The page you seek cannot be found, but fortune cookies remain plentiful.",
          "A 404 error is just an opportunity to explore somewhere new.",
          "You will find what you seek... just not here.",
          "The path forward is unclear. Try going back.",
          "Your lucky numbers are: 4, 0, 4",
          "An error today keeps the bugs away... wait, that's not right.",
          "In the land of the lost, the one with a map is king.",
          "You will soon discover something that was always there."
        ];
        const fortune = fortunes[Math.floor(Math.random() * fortunes.length)];
        context.addToHistory("fortune", fortune, "success");
      },
      description: "Get your fortune"
    },
    "echo $PATH": {
      action: () => {
        context.addToHistory(
          "echo $PATH",
          "/home:/blog:/resume:/contact:/downloads:/account",
          "success"
        );
      },
      description: "Show available paths"
    },
    neofetch: {
      action: () => {
        const theme = context.isDark ? "Catppuccin-mocha" : "Gruvbox-light";
        context.addToHistory(
          "neofetch",
          `       _,met$$$$$gg.          guest@freno.dev\n    ,g$$$$$$$$$$$$$$$P.       ----------------\n  ,g$$P\"\"       \"\"\"Y$$.\"     OS: 404 Not Found\n ,$$P'              \`$$$.    Shell: terminal-shell\n',$$P       ,ggs.     \`$$b:  Resolution: Lost\n\`d$$'     ,$P\"'   .    $$$   Theme: ${theme}\n $$P      d$'     ,    $$P   Terminal: web-terminal\n $$:      $$.   -    ,d$$'   CPU: Confusion (404)\n $$;      Y$b._   _,d$P'     Memory: ???\n Y$$.    \`.\`\"Y$$$$P\"'        \n \`$$b      \"-.__            \n  \`Y$$                      \n   \`Y$$.                    \n     \`$$b.                  \n       \`Y$$b.               \n          \`\"Y$b._           \n              \`\"\"\"\"        `,
          "info"
        );
      },
      description: "Display system info"
    },
    "cat /dev/urandom": {
      action: () => {
        const random = Array.from({ length: 10 }, () =>
          Math.random().toString(36).substring(2, 15)
        ).join("\n");
        context.addToHistory(
          "cat /dev/urandom",
          random + "\n^C (interrupted)",
          "success"
        );
      },
      description: "Show random data"
    },
    uptime: {
      action: () => {
        context.addToHistory(
          "uptime",
          "up way too long, load average: ∞, ∞, ∞",
          "success"
        );
      },
      description: "Show system uptime"
    },
    date: {
      action: () => {
        context.addToHistory("date", new Date().toString(), "success");
      },
      description: "Display current date and time"
    },
    "uname -a": {
      action: () => {
        context.addToHistory(
          "uname -a",
          "ErrorOS 404.0.0 #1 SMP PREEMPT_DYNAMIC Web x86_64 GNU/Browser",
          "success"
        );
      },
      description: "Print system information"
    }
  };

  // Add all cd variants for each route
  routes.forEach((route) => {
    // cd blog (visible in help)
    commands[`cd ${route.name}`] = {
      action: () => context.navigate(route.path),
      description: `Navigate to ${route.name}`
    };
    // cd /blog (hidden alias)
    commands[`cd ${route.path}`] = {
      action: () => context.navigate(route.path),
      description: `Navigate to ${route.name}`,
      hidden: true
    };
    // cd ~/blog (hidden alias)
    commands[`cd ~${route.path}`] = {
      action: () => context.navigate(route.path),
      description: `Navigate to ${route.name}`,
      hidden: true
    };
  });

  return commands;
};

export const executeTerminalCommand = (
  cmd: string,
  commands: Record<
    string,
    { action: () => void; description: string; hidden?: boolean }
  >,
  addToHistory: (
    cmd: string,
    output: string,
    type: "success" | "error" | "info"
  ) => void
) => {
  const trimmed = cmd.trim();

  if (!trimmed) return;

  if (commands[trimmed]) {
    commands[trimmed].action();
  } else if (trimmed.startsWith("cd ")) {
    const path = trimmed.slice(3);
    addToHistory(trimmed, `cd: ${path}: No such file or directory`, "error");
  } else if (trimmed.startsWith("echo ")) {
    const text = trimmed.slice(5);
    addToHistory(trimmed, text, "success");
  } else if (
    trimmed.startsWith("cat ") ||
    trimmed.startsWith("less ") ||
    trimmed.startsWith("more ")
  ) {
    const file = trimmed.split(" ")[1];
    addToHistory(
      trimmed,
      `${trimmed.split(" ")[0]}: ${file}: No such file or directory`,
      "error"
    );
  } else {
    addToHistory(
      trimmed,
      `command not found: ${trimmed}\nType 'help' for available commands`,
      "error"
    );
  }
};
