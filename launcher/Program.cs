using System;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using System.Diagnostics;
using System.Drawing;
using System.Windows.Forms;
using System.Text;
using System.Text.RegularExpressions;
using System.Collections.Generic;
using System.Security.Cryptography;
using System.Web.Script.Serialization;

namespace HotelDasOliveirasLauncher
{
    public class HotelAppContext : ApplicationContext
    {
        private Mutex appMutex;
        private HttpListener httpListener;
        private Thread serverThread;
        private volatile bool isRunning = true;
        private int activePort = 5055;
        private string projectDirectory;
        private string appDataDirectory;
        private NotifyIcon trayIcon;
        private Process browserProcess;
        private readonly object authSync = new object();
        private readonly object sessionSync = new object();
        private readonly Dictionary<string, DateTime> adminSessions = new Dictionary<string, DateTime>();
        private string authFilePath;
        private int failedLoginAttempts;
        private DateTime loginLockoutUntilUtc = DateTime.MinValue;

        public sealed class AdminCredentials
        {
            public string Username { get; set; }
            public string Salt { get; set; }
            public string PasswordHash { get; set; }
            public int Iterations { get; set; }
        }

        public HotelAppContext(Mutex mutex, int port)
        {
            this.appMutex = mutex;
            this.activePort = port;
            this.projectDirectory = AppDomain.CurrentDomain.BaseDirectory;
            this.appDataDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "HotelOliveiras"
            );
            this.authFilePath = Path.Combine(appDataDirectory, "admin-auth.json");

            try
            {
                // Inicia o servidor HTTP embutido
                StartHttpServer(activePort);

                // Configura o ícone na bandeja do sistema (System Tray)
                SetupTrayIcon();

                // Abre a janela do aplicativo
                OpenAppWindow();
            }
            catch (Exception ex)
            {
                Log("Erro na inicialização: " + ex.ToString());
                MessageBox.Show(
                    "Ocorreu um erro ao iniciar o sistema: " + ex.Message,
                    "Hotel das Oliveiras",
                    MessageBoxButtons.OK,
                    MessageBoxIcon.Error
                );
                ShutdownApp();
            }
        }

        private void StartHttpServer(int port)
        {
            httpListener = new HttpListener();
            httpListener.Prefixes.Add(string.Format("http://127.0.0.1:{0}/", port));
            httpListener.Prefixes.Add(string.Format("http://localhost:{0}/", port));
            httpListener.Start();

            serverThread = new Thread(ProcessRequests)
            {
                IsBackground = true,
                Name = "HotelWebServerThread"
            };
            serverThread.Start();
            Log(string.Format("Servidor iniciado na porta {0}", port));
        }

        private void StopHttpServer()
        {
            isRunning = false;
            try
            {
                if (httpListener != null && httpListener.IsListening)
                {
                    httpListener.Stop();
                    httpListener.Close();
                }
            }
            catch { }
        }

        private void ProcessRequests()
        {
            while (isRunning && httpListener != null && httpListener.IsListening)
            {
                try
                {
                    HttpListenerContext context = httpListener.GetContext();
                    ThreadPool.QueueUserWorkItem((ctx) => HandleRequest((HttpListenerContext)ctx), context);
                }
                catch (HttpListenerException)
                {
                    break;
                }
                catch (Exception ex)
                {
                    if (!isRunning) break;
                    Log("Erro em ProcessRequests: " + ex.Message);
                }
            }
        }

        private void HandleRequest(HttpListenerContext context)
        {
            try
            {
                HttpListenerRequest req = context.Request;
                HttpListenerResponse res = context.Response;

                string rawPath = req.Url.LocalPath;
                if (string.IsNullOrEmpty(rawPath) || rawPath == "/")
                {
                    rawPath = "/index.html";
                }

                string decodedPath = Uri.UnescapeDataString(rawPath);
                string normalizedPath = decodedPath.Replace('\\', '/').ToLowerInvariant();
                res.Headers["X-Content-Type-Options"] = "nosniff";
                res.Headers["Cache-Control"] = "no-store";

                if (normalizedPath.StartsWith("/api/auth/", StringComparison.Ordinal))
                {
                    HandleAuthRequest(context, normalizedPath);
                    return;
                }

                bool authenticated = IsAdminAuthenticated(req);
                if (normalizedPath == "/admin.html" && !authenticated)
                {
                    res.StatusCode = 302;
                    res.RedirectLocation = "/login.html";
                    res.Close();
                    return;
                }
                if (normalizedPath == "/js/admin.js" && !authenticated)
                {
                    WriteTextResponse(context, 403, "text/plain; charset=utf-8", "403 - Acesso restrito.");
                    return;
                }

                // Proteção contra acesso a arquivos fora da pasta do sistema.
                string relativePath = decodedPath.TrimStart('/', '\\');
                string targetFilePath = Path.GetFullPath(Path.Combine(projectDirectory, relativePath));
                string rootPath = Path.GetFullPath(projectDirectory).TrimEnd(
                    Path.DirectorySeparatorChar,
                    Path.AltDirectorySeparatorChar
                );

                if (!targetFilePath.StartsWith(
                        rootPath + Path.DirectorySeparatorChar,
                        StringComparison.OrdinalIgnoreCase
                    ) && !string.Equals(targetFilePath, rootPath, StringComparison.OrdinalIgnoreCase))
                {
                    WriteTextResponse(context, 403, "text/plain; charset=utf-8", "403 - Acesso Negado");
                    return;
                }

                if (!File.Exists(targetFilePath))
                {
                    WriteTextResponse(context, 404, "text/plain; charset=utf-8", "404 - Arquivo não encontrado.");
                    return;
                }

                string ext = Path.GetExtension(targetFilePath).ToLowerInvariant();
                res.ContentType = GetMimeType(ext);
                res.StatusCode = 200;

                byte[] fileBytes = File.ReadAllBytes(targetFilePath);
                res.ContentLength64 = fileBytes.Length;
                res.OutputStream.Write(fileBytes, 0, fileBytes.Length);
                res.OutputStream.Flush();
                res.Close();
            }
            catch (Exception ex)
            {
                Log("Erro ao processar requisição HTTP: " + ex.ToString());
                try { context.Response.Close(); } catch { }
            }
        }

        private void HandleAuthRequest(HttpListenerContext context, string path)
        {
            HttpListenerRequest request = context.Request;
            HttpListenerResponse response = context.Response;

            if (path == "/api/auth/status" && request.HttpMethod == "GET")
            {
                bool configured = File.Exists(authFilePath);
                WriteJsonResponse(context, 200, new
                {
                    configured = configured,
                    authenticated = configured && IsAdminAuthenticated(request)
                });
                return;
            }

            if (request.HttpMethod != "POST")
            {
                response.Headers["Allow"] = "GET, POST";
                WriteJsonResponse(context, 405, new { error = "Método não permitido." });
                return;
            }

            if (!IsSameOriginRequest(request))
            {
                WriteJsonResponse(context, 403, new { error = "Requisição de origem inválida." });
                return;
            }

            string body;
            Dictionary<string, object> values;
            try
            {
                body = ReadRequestBody(request, 8192);
                JavaScriptSerializer serializer = new JavaScriptSerializer();
                values = serializer.Deserialize<Dictionary<string, object>>(body);
                if (values == null)
                {
                    WriteJsonResponse(context, 400, new { error = "Dados de acesso inválidos." });
                    return;
                }
            }
            catch (InvalidDataException)
            {
                WriteJsonResponse(context, 413, new { error = "A solicitação é muito grande." });
                return;
            }
            catch (Exception ex)
            {
                Log("Dados de autenticação inválidos: " + ex.Message);
                WriteJsonResponse(context, 400, new { error = "Dados de acesso inválidos." });
                return;
            }

            string username = GetInputValue(values, "username").Trim();
            string password = GetInputValue(values, "password");

            if (path == "/api/auth/setup")
            {
                if (!Regex.IsMatch(username, @"^[\p{L}\p{N}._-]{3,32}$") ||
                    password.Length < 10 || password.Length > 128)
                {
                    WriteJsonResponse(context, 400, new
                    {
                        error = "Use um usuário de 3 a 32 caracteres (letras, números, ponto, hífen ou sublinhado) e uma senha de 10 a 128 caracteres."
                    });
                    return;
                }

                lock (authSync)
                {
                    if (File.Exists(authFilePath))
                    {
                        WriteJsonResponse(context, 409, new { error = "O usuário administrador já foi configurado." });
                        return;
                    }

                    try
                    {
                        byte[] salt = new byte[16];
                        using (RNGCryptoServiceProvider random = new RNGCryptoServiceProvider())
                        {
                            random.GetBytes(salt);
                        }

                        AdminCredentials credentials = new AdminCredentials
                        {
                            Username = username,
                            Salt = Convert.ToBase64String(salt),
                            PasswordHash = Convert.ToBase64String(DerivePasswordHash(password, salt, 200000)),
                            Iterations = 200000
                        };
                        SaveCredentials(credentials);
                        IssueAdminSession(response);
                        WriteJsonResponse(context, 200, new { success = true });
                    }
                    catch (Exception ex)
                    {
                        Log("Erro ao criar usuário administrador: " + ex.ToString());
                        WriteJsonResponse(context, 500, new { error = "Não foi possível salvar o usuário administrador." });
                    }
                }
                return;
            }

            if (path == "/api/auth/login")
            {
                lock (authSync)
                {
                    if (DateTime.UtcNow < loginLockoutUntilUtc)
                    {
                        WriteJsonResponse(context, 429, new
                        {
                            error = "Muitas tentativas de acesso. Aguarde um minuto e tente novamente."
                        });
                        return;
                    }

                    if (!File.Exists(authFilePath))
                    {
                        WriteJsonResponse(context, 409, new { error = "Configure primeiro o usuário administrador." });
                        return;
                    }

                    try
                    {
                        AdminCredentials credentials = LoadCredentials();
                        byte[] salt = Convert.FromBase64String(credentials.Salt);
                        byte[] expectedHash = Convert.FromBase64String(credentials.PasswordHash);
                        byte[] submittedHash = DerivePasswordHash(password, salt, credentials.Iterations);
                        bool valid = string.Equals(credentials.Username, username, StringComparison.OrdinalIgnoreCase)
                            && FixedTimeEquals(expectedHash, submittedHash);

                        if (!valid)
                        {
                            failedLoginAttempts++;
                            if (failedLoginAttempts >= 5)
                            {
                                failedLoginAttempts = 0;
                                loginLockoutUntilUtc = DateTime.UtcNow.AddMinutes(1);
                            }
                            WriteJsonResponse(context, 401, new { error = "Usuário ou senha incorretos." });
                            return;
                        }

                        failedLoginAttempts = 0;
                        loginLockoutUntilUtc = DateTime.MinValue;
                        IssueAdminSession(response);
                        WriteJsonResponse(context, 200, new { success = true });
                    }
                    catch (Exception ex)
                    {
                        Log("Erro ao validar usuário administrador: " + ex.ToString());
                        WriteJsonResponse(context, 500, new { error = "Não foi possível validar o acesso." });
                    }
                }
                return;
            }

            if (path == "/api/auth/logout")
            {
                string token = GetSessionToken(request);
                if (!string.IsNullOrEmpty(token))
                {
                    lock (sessionSync)
                    {
                        adminSessions.Remove(token);
                    }
                }

                response.AppendHeader(
                    "Set-Cookie",
                    "hotel_admin_session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0"
                );
                WriteJsonResponse(context, 200, new { success = true });
                return;
            }

            WriteJsonResponse(context, 404, new { error = "Rota não encontrada." });
        }

        private bool IsSameOriginRequest(HttpListenerRequest request)
        {
            string origin = request.Headers["Origin"];
            Uri originUri;
            return !string.IsNullOrEmpty(origin) &&
                Uri.TryCreate(origin, UriKind.Absolute, out originUri) &&
                string.Equals(originUri.Scheme, request.Url.Scheme, StringComparison.OrdinalIgnoreCase) &&
                string.Equals(originUri.Host, request.Url.Host, StringComparison.OrdinalIgnoreCase) &&
                originUri.Port == request.Url.Port;
        }

        private bool IsAdminAuthenticated(HttpListenerRequest request)
        {
            string token = GetSessionToken(request);
            if (string.IsNullOrEmpty(token)) return false;

            lock (sessionSync)
            {
                DateTime expiresAt;
                if (!adminSessions.TryGetValue(token, out expiresAt)) return false;
                if (expiresAt <= DateTime.UtcNow)
                {
                    adminSessions.Remove(token);
                    return false;
                }
                return true;
            }
        }

        private string GetSessionToken(HttpListenerRequest request)
        {
            Cookie cookie = request.Cookies["hotel_admin_session"];
            return cookie == null ? null : cookie.Value;
        }

        private void IssueAdminSession(HttpListenerResponse response)
        {
            byte[] tokenBytes = new byte[32];
            using (RNGCryptoServiceProvider random = new RNGCryptoServiceProvider())
            {
                random.GetBytes(tokenBytes);
            }
            string token = Convert.ToBase64String(tokenBytes)
                .TrimEnd('=')
                .Replace('+', '-')
                .Replace('/', '_');

            lock (sessionSync)
            {
                adminSessions[token] = DateTime.UtcNow.AddHours(8);
            }

            response.AppendHeader(
                "Set-Cookie",
                "hotel_admin_session=" + token + "; Path=/; HttpOnly; SameSite=Strict; Max-Age=28800"
            );
        }

        private string ReadRequestBody(HttpListenerRequest request, int maxCharacters)
        {
            if (request.ContentLength64 > maxCharacters * 4)
            {
                throw new InvalidDataException("Request body exceeds the allowed size.");
            }

            StringBuilder body = new StringBuilder();
            char[] buffer = new char[1024];
            using (StreamReader reader = new StreamReader(request.InputStream, Encoding.UTF8))
            {
                int read;
                while ((read = reader.Read(buffer, 0, buffer.Length)) > 0)
                {
                    if (body.Length + read > maxCharacters)
                    {
                        throw new InvalidDataException("Request body exceeds the allowed size.");
                    }
                    body.Append(buffer, 0, read);
                }
            }
            return body.ToString();
        }

        private string GetInputValue(Dictionary<string, object> values, string name)
        {
            object value;
            return values.TryGetValue(name, out value) && value != null
                ? Convert.ToString(value)
                : string.Empty;
        }

        private byte[] DerivePasswordHash(string password, byte[] salt, int iterations)
        {
            using (Rfc2898DeriveBytes deriveBytes = new Rfc2898DeriveBytes(password, salt, iterations))
            {
                return deriveBytes.GetBytes(32);
            }
        }

        private bool FixedTimeEquals(byte[] expected, byte[] actual)
        {
            if (expected == null || actual == null || expected.Length != actual.Length) return false;
            int difference = 0;
            for (int i = 0; i < expected.Length; i++)
            {
                difference |= expected[i] ^ actual[i];
            }
            return difference == 0;
        }

        private void SaveCredentials(AdminCredentials credentials)
        {
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            string temporaryPath = authFilePath + "." + Guid.NewGuid().ToString("N") + ".tmp";
            File.WriteAllText(temporaryPath, serializer.Serialize(credentials), Encoding.UTF8);
            File.Move(temporaryPath, authFilePath);
        }

        private AdminCredentials LoadCredentials()
        {
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            AdminCredentials credentials = serializer.Deserialize<AdminCredentials>(
                File.ReadAllText(authFilePath, Encoding.UTF8)
            );
            if (credentials == null ||
                string.IsNullOrEmpty(credentials.Username) ||
                string.IsNullOrEmpty(credentials.Salt) ||
                string.IsNullOrEmpty(credentials.PasswordHash) ||
                credentials.Iterations < 100000 ||
                credentials.Iterations > 1000000)
            {
                throw new InvalidDataException("Stored administrator credentials are invalid.");
            }
            return credentials;
        }

        private void WriteJsonResponse(HttpListenerContext context, int statusCode, object value)
        {
            JavaScriptSerializer serializer = new JavaScriptSerializer();
            WriteTextResponse(
                context,
                statusCode,
                "application/json; charset=utf-8",
                serializer.Serialize(value)
            );
        }

        private void WriteTextResponse(HttpListenerContext context, int statusCode, string contentType, string body)
        {
            byte[] bytes = Encoding.UTF8.GetBytes(body);
            context.Response.StatusCode = statusCode;
            context.Response.ContentType = contentType;
            context.Response.ContentLength64 = bytes.Length;
            context.Response.OutputStream.Write(bytes, 0, bytes.Length);
            context.Response.Close();
        }

        private string GetMimeType(string extension)
        {
            switch (extension)
            {
                case ".html":
                case ".htm":
                    return "text/html; charset=utf-8";
                case ".css":
                    return "text/css; charset=utf-8";
                case ".js":
                    return "application/javascript; charset=utf-8";
                case ".json":
                    return "application/json; charset=utf-8";
                case ".png":
                    return "image/png";
                case ".jpg":
                case ".jpeg":
                    return "image/jpeg";
                case ".gif":
                    return "image/gif";
                case ".svg":
                    return "image/svg+xml";
                case ".ico":
                    return "image/x-icon";
                case ".woff":
                    return "font/woff";
                case ".woff2":
                    return "font/woff2";
                case ".ttf":
                    return "font/ttf";
                default:
                    return "application/octet-stream";
            }
        }

        public void OpenAppWindow()
        {
            string url = string.Format("http://127.0.0.1:{0}/index.html", activePort);
            string profileDir = Path.Combine(appDataDirectory, "AppProfile");

            string[] browserCandidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google\\Chrome\\Application\\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google\\Chrome\\Application\\chrome.exe")
            };

            string browserExecutable = null;
            foreach (string candidate in browserCandidates)
            {
                if (File.Exists(candidate))
                {
                    browserExecutable = candidate;
                    break;
                }
            }

            try
            {
                if (!string.IsNullOrEmpty(browserExecutable))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = browserExecutable,
                        Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1366,850", url, profileDir),
                        UseShellExecute = false
                    };
                    browserProcess = Process.Start(psi);
                }
                else
                {
                    ProcessStartInfo psi = new ProcessStartInfo(url)
                    {
                        UseShellExecute = true
                    };
                    Process.Start(psi);
                }
            }
            catch (Exception ex)
            {
                Log("Erro ao abrir navegador: " + ex.Message);
                MessageBox.Show("Erro ao abrir o navegador: " + ex.Message, "Hotel das Oliveiras", MessageBoxButtons.OK, MessageBoxIcon.Error);
            }
        }

        private void SetupTrayIcon()
        {
            trayIcon = new NotifyIcon();

            Icon loadedIcon = null;
            string iconPath = Path.Combine(projectDirectory, "app.ico");
            if (File.Exists(iconPath))
            {
                try { loadedIcon = new Icon(iconPath); } catch { }
            }
            if (loadedIcon == null)
            {
                try { loadedIcon = Icon.ExtractAssociatedIcon(Application.ExecutablePath); } catch { }
            }
            if (loadedIcon == null)
            {
                loadedIcon = SystemIcons.Application;
            }

            trayIcon.Icon = loadedIcon;
            trayIcon.Text = "Hotel das Oliveiras - Sistema Ativo";
            trayIcon.Visible = true;

            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add(new MenuItem("🌿 Abrir Hotel das Oliveiras", (s, e) => OpenAppWindow()));
            menu.MenuItems.Add(new MenuItem("📁 Abrir Pasta do Sistema", (s, e) => {
                try { Process.Start("explorer.exe", projectDirectory); } catch { }
            }));
            menu.MenuItems.Add(new MenuItem("-"));
            menu.MenuItems.Add(new MenuItem("❌ Encerrar Sistema", (s, e) => ShutdownApp()));

            trayIcon.ContextMenu = menu;
            trayIcon.DoubleClick += (s, e) => OpenAppWindow();

            trayIcon.ShowBalloonTip(
                2000,
                "Hotel das Oliveiras",
                "O sistema de reservas está em execução. Clique aqui para abrir a janela a qualquer momento.",
                ToolTipIcon.Info
            );
            trayIcon.BalloonTipClicked += (s, e) => OpenAppWindow();
        }

        private void ShutdownApp()
        {
            StopHttpServer();
            if (trayIcon != null)
            {
                trayIcon.Visible = false;
                trayIcon.Dispose();
                trayIcon = null;
            }
            if (appMutex != null)
            {
                try { appMutex.ReleaseMutex(); } catch { }
                appMutex.Dispose();
                appMutex = null;
            }
            ExitThread();
        }

        private void Log(string msg)
        {
            try
            {
                string logFile = Path.Combine(appDataDirectory, "launcher.log");
                File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss}] {1}\r\n", DateTime.Now, msg));
            }
            catch { }
        }
    }

    static class Program
    {
        private static Mutex appMutex;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            string appDataDirectory = Path.Combine(
                Environment.GetFolderPath(Environment.SpecialFolder.LocalApplicationData),
                "HotelOliveiras"
            );

            if (!Directory.Exists(appDataDirectory))
            {
                try { Directory.CreateDirectory(appDataDirectory); } catch { }
            }

            string logFile = Path.Combine(appDataDirectory, "launcher.log");
            File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss}] Main iniciou. Verificando Mutex...\r\n", DateTime.Now));

            string mutexName = "Local\\HotelDasOliveirasPMS_Mutex_Launcher";
            bool createdNew;
            appMutex = new Mutex(true, mutexName, out createdNew);

            File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss}] createdNew={1}\r\n", DateTime.Now, createdNew));

            string portFilePath = Path.Combine(appDataDirectory, "port.txt");

            if (!createdNew)
            {
                // Já existe uma instância do sistema rodando
                File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss}] Instancia secundaria detectada. Chamando LaunchBrowserOnly...\r\n", DateTime.Now));
                int existingPort = 5055;
                if (File.Exists(portFilePath))
                {
                    int.TryParse(File.ReadAllText(portFilePath).Trim(), out existingPort);
                }
                LaunchBrowserOnly(existingPort, appDataDirectory);
                return;
            }

            int port = FindAvailablePort(5055);
            try
            {
                File.WriteAllText(portFilePath, port.ToString());
            }
            catch { }

            File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss}] Criando HotelAppContext na porta {1}...\r\n", DateTime.Now, port));
            HotelAppContext context = new HotelAppContext(appMutex, port);
            File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss}] Executando Application.Run...\r\n", DateTime.Now));
            Application.Run(context);
            File.AppendAllText(logFile, string.Format("[{0:yyyy-MM-dd HH:mm:ss}] Application.Run finalizou.\r\n", DateTime.Now));
        }

        private static int FindAvailablePort(int startingPort)
        {
            for (int p = startingPort; p < startingPort + 50; p++)
            {
                try
                {
                    TcpListener tcp = new TcpListener(IPAddress.Loopback, p);
                    tcp.Start();
                    tcp.Stop();
                    return p;
                }
                catch { }
            }

            TcpListener dynamicTcp = new TcpListener(IPAddress.Loopback, 0);
            dynamicTcp.Start();
            int dynamicPort = ((IPEndPoint)dynamicTcp.LocalEndpoint).Port;
            dynamicTcp.Stop();
            return dynamicPort;
        }

        private static void LaunchBrowserOnly(int port, string appDataDir)
        {
            string url = string.Format("http://127.0.0.1:{0}/index.html", port);
            string profileDir = Path.Combine(appDataDir, "AppProfile");

            string[] candidates = new string[]
            {
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Microsoft\\Edge\\Application\\msedge.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFiles), "Google\\Chrome\\Application\\chrome.exe"),
                Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.ProgramFilesX86), "Google\\Chrome\\Application\\chrome.exe")
            };

            string browser = null;
            foreach (string c in candidates)
            {
                if (File.Exists(c))
                {
                    browser = c;
                    break;
                }
            }

            try
            {
                if (!string.IsNullOrEmpty(browser))
                {
                    ProcessStartInfo psi = new ProcessStartInfo
                    {
                        FileName = browser,
                        Arguments = string.Format("--app=\"{0}\" --user-data-dir=\"{1}\" --window-size=1366,850", url, profileDir),
                        UseShellExecute = false
                    };
                    Process.Start(psi);
                }
                else
                {
                    ProcessStartInfo psi = new ProcessStartInfo(url) { UseShellExecute = true };
                    Process.Start(psi);
                }
            }
            catch { }
        }
    }
}
