import eventlet
eventlet.monkey_patch()

import os

from views import *

if __name__ == "__main__":
    app.secret_key = os.urandom(19)
    
    if os.path.exists('../certificates'):
        eventlet.wsgi.server(eventlet.wrap_ssl(eventlet.listen(('0.0.0.0', 7979)), keyfile='../certificates/private.key', certfile='../certificates/pado_ddnsking_com.pem'), app)

    else:
        app.run('0.0.0.0', 7979, debug=True, use_reloader=True)
        
        