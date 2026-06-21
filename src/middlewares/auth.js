import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) return res.status(403).json({ error: 'No token provided' });
  
  const tokenParts = token.split(' ');
  const bearerToken = tokenParts[1] || tokenParts[0];

  jwt.verify(bearerToken, process.env.JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: 'Unauthorized!' });
    req.userId = decoded.id;
    req.userRole = decoded.role;
    next();
  });
};

const isAdmin = (req, res, next) => {
  if (req.userRole === 'admin') {
    next();
    return;
  }
  res.status(403).json({ error: 'Require Admin Role!' });
};

const isKasirOrAdmin = (req, res, next) => {
  if (req.userRole === 'kasir' || req.userRole === 'admin') {
    next();
    return;
  }
  res.status(403).json({ error: 'Require Kasir or Admin Role!' });
};

export { verifyToken, isAdmin, isKasirOrAdmin };
