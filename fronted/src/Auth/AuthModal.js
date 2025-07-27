import React, { useState, useEffect } from 'react';
import Cookies from 'js-cookie';

const AuthModal = () => {
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    // אם הקוקי של האימות לא קיים, מציגים את החלון קופץ
    if (!Cookies.get('auth_token')) {
      setShowModal(true);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const code = e.target.elements.code.value;

    // שולחים את הקוד לשרת לאימות
    const response = await fetch('/api/authenticate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ code }),
    });

    if (response.ok) {
      const data = await response.json();
      // שומרים את הטוקן בקוקי עם תוקף של 1 יום
      Cookies.set('auth_token', data.token, { expires: '24h' });
      setShowModal(false); // סוגרים את החלון קופץ אם ההתחברות הצליחה
    } else {
      alert('Invalid code!');
    }
  };

  return (
    showModal && (
      <div className="modal">
        <form onSubmit={handleSubmit}>
          <label>אנא הכנס סיסמה:</label>
          <input type="text" name="code" required />
          <button type="submit">שלח</button>
        </form>
      </div>
    )
  );
};

export default AuthModal;
