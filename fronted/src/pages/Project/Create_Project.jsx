import { useState } from 'react';
// import SuccessAnimation from '../../Components/SuccessAnimation.jsx'
import api from '../../api/api.jsx';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';


const CreateProject = () => {
	const [name, setName] = useState('');
	const [invitingName, setInvitingName] = useState('')
	const [Contact_person, setContact_Person] = useState('')
	const [loading, setLoading] = useState(true);

	// const [selectedSupplier, setSelectedSupplier] = useState(null);
	// const [success, setSuccess] = useState(null);
	// const [showAnimation, setShowAnimation] = useState(false);

	const navigate = useNavigate();


	const handleSubmit = async (e) => {
		e.preventDefault();
		try {

			await api.post('/projects',
				{ name, invitingName, Contact_person },
				{
					headers: {
						'Content-Type': 'application/json',
					},
				}
			);
			// setShowAnimation(true);
			toast.success('הפרויקט נוצר בהצלחה ', {
				className: "sonner-toast success rtl"
			});
			setName('');
			setInvitingName('');
			navigate('/projects')



		} catch (err) {
			// If the server returns a 400 error, it means the project already exists
			if (err.response && err.response.status === 400) {
				toast.error(err.response.data.error, {
					className: "sonner-toast error rtl"
				});  // Show the error message from the server
			} else {
				toast.error('נכשל ביצירת הפרויקט', {
					className: "sonner-toast error rtl"
				});
			}
		}
	};

	return (
		<div className="min-h-screen flex items-center justify-center p-4 ">
			<div className="bg-gray-300 p-8 rounded-lg shadow-xl max-w-md w-full">
				<h2 className="text-3xl font-bold text-center text-slate-700 mb-6">יצירת פרויקט</h2>
				{/* {success && <p className="text-green-600 text-center mb-4">{success}</p>} */}

				<form onSubmit={handleSubmit}>
					<div className="mb-8">
						<label className="block text-lg font-bold text-black mb-2">שם הפרויקט : </label>
						<input
							type="text"
							value={name}
							onChange={(e) => setName(e.target.value)}
							required
							className="w-full font-bold p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
						/>
					</div>

					<div className="mb-10">
				  <div className="mb-10">

  <label className="block text-lg font-bold text-black mb-2 mt-6">שם המזמין :</label>
  <input
    type="text"
    value={invitingName}
    onChange={(e) => setInvitingName(e.target.value)}
    required
    className="w-full p-3 border font-bold border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
  <label className="block text-lg font-bold text-black mb-2 mt-6">איש קשר:</label>
  <input
    type="text"
    value={Contact_person}
    onChange={(e) => setContact_Person(e.target.value)}
    required
    className="w-full p-3 border font-bold border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>
					
					</div>
					<div className="grid place-items-center ">
						<button type="submit" className="grid place-items-center w-36 py-3 bg-slate-800 text-white text-lg font-semibold rounded-lg hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500">
							צור פרויקט
						</button>
					</div>

					{/* {showAnimation && <SuccessAnimation text="הפרויקט נוצר בהצלחה!" />} */}

				</form>
			</div>
		</div>
	);
};

export default CreateProject;
